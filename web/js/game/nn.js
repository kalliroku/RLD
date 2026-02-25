/**
 * Neural Network utility - Vanilla JS MLP with backpropagation
 * Reusable for DQN, PPO, A2C, etc.
 *
 * Features:
 * - He initialization (sqrt(2/fanIn))
 * - ReLU hidden layers, Linear output
 * - Gradient clipping [-1, 1]
 * - SGD weight update
 * - Clone / copyFrom for target networks
 * - JSON serialization
 */

// Box-Muller transform for Gaussian random numbers
function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export class NeuralNetwork {
    /**
     * @param {number[]} layerSizes - e.g. [3, 64, 32, 4]
     */
    constructor(layerSizes) {
        this.layerSizes = layerSizes;
        this.layers = [];

        // Create layers (connections between adjacent sizes)
        for (let i = 0; i < layerSizes.length - 1; i++) {
            const fanIn = layerSizes[i];
            const fanOut = layerSizes[i + 1];
            const isOutput = (i === layerSizes.length - 2);

            // He initialization: w ~ N(0, sqrt(2/fanIn))
            const scale = Math.sqrt(2.0 / fanIn);
            const weights = [];
            for (let r = 0; r < fanOut; r++) {
                const row = [];
                for (let c = 0; c < fanIn; c++) {
                    row.push(randn() * scale);
                }
                weights.push(row);
            }

            const biases = new Array(fanOut).fill(0);

            this.layers.push({
                weights,   // fanOut x fanIn
                biases,    // fanOut
                activation: isOutput ? 'linear' : 'relu'
            });
        }

        // Storage for forward pass activations (used in backward)
        this._preActivations = null;  // z values before activation
        this._activations = null;     // a values after activation
    }

    /**
     * Forward pass with activation storage (for training)
     * @param {number[]} input
     * @returns {number[]} output
     */
    forward(input) {
        this._activations = [input.slice()];
        this._preActivations = [];

        let current = input;

        for (const layer of this.layers) {
            const { weights, biases, activation } = layer;
            const fanOut = weights.length;
            const z = new Array(fanOut);

            for (let r = 0; r < fanOut; r++) {
                let sum = biases[r];
                const row = weights[r];
                for (let c = 0; c < current.length; c++) {
                    sum += row[c] * current[c];
                }
                z[r] = sum;
            }

            this._preActivations.push(z);

            // Apply activation
            let a;
            if (activation === 'relu') {
                a = z.map(v => v > 0 ? v : 0);
            } else {
                a = z.slice(); // linear
            }

            this._activations.push(a);
            current = a;
        }

        return current;
    }

    /**
     * Forward pass without storage (for inference)
     * @param {number[]} input
     * @returns {number[]} output
     */
    predict(input) {
        let current = input;

        for (const layer of this.layers) {
            const { weights, biases, activation } = layer;
            const fanOut = weights.length;
            const next = new Array(fanOut);

            for (let r = 0; r < fanOut; r++) {
                let sum = biases[r];
                const row = weights[r];
                for (let c = 0; c < current.length; c++) {
                    sum += row[c] * current[c];
                }
                if (activation === 'relu') {
                    next[r] = sum > 0 ? sum : 0;
                } else {
                    next[r] = sum;
                }
            }

            current = next;
        }

        return current;
    }

    /**
     * Backward pass - compute gradients
     * Must call forward() first to populate activations.
     *
     * @param {number[]} outputGradient - dL/d(output), same size as output layer
     * @returns {Object[]} gradients per layer: [{ dW: number[][], dB: number[] }, ...]
     */
    backward(outputGradient) {
        const numLayers = this.layers.length;
        const gradients = new Array(numLayers);

        let delta = outputGradient;

        for (let l = numLayers - 1; l >= 0; l--) {
            const layer = this.layers[l];
            const z = this._preActivations[l];
            const aIn = this._activations[l]; // input to this layer

            // Apply activation derivative
            let dz;
            if (layer.activation === 'relu') {
                dz = delta.map((d, i) => z[i] > 0 ? d : 0);
            } else {
                dz = delta.slice(); // linear: derivative = 1
            }

            // Gradient clipping
            for (let i = 0; i < dz.length; i++) {
                if (dz[i] > 1) dz[i] = 1;
                else if (dz[i] < -1) dz[i] = -1;
            }

            // Compute weight and bias gradients (with clipping)
            const fanOut = layer.weights.length;
            const fanIn = aIn.length;
            const dW = [];
            for (let r = 0; r < fanOut; r++) {
                const row = new Array(fanIn);
                for (let c = 0; c < fanIn; c++) {
                    let g = dz[r] * aIn[c];
                    if (g > 1) g = 1;
                    else if (g < -1) g = -1;
                    row[c] = g;
                }
                dW.push(row);
            }
            const dB = dz.slice();

            gradients[l] = { dW, dB };

            // Propagate delta to previous layer
            if (l > 0) {
                const prevDelta = new Array(fanIn).fill(0);
                for (let r = 0; r < fanOut; r++) {
                    const row = layer.weights[r];
                    for (let c = 0; c < fanIn; c++) {
                        prevDelta[c] += row[c] * dz[r];
                    }
                }
                delta = prevDelta;
            }
        }

        return gradients;
    }

    /**
     * SGD weight update
     * @param {Object[]} gradients - from backward()
     * @param {number} lr - learning rate
     */
    update(gradients, lr) {
        for (let l = 0; l < this.layers.length; l++) {
            const layer = this.layers[l];
            const { dW, dB } = gradients[l];

            for (let r = 0; r < layer.weights.length; r++) {
                for (let c = 0; c < layer.weights[r].length; c++) {
                    layer.weights[r][c] -= lr * dW[r][c];
                }
                layer.biases[r] -= lr * dB[r];
            }
        }
    }

    /**
     * Deep copy - creates independent network with same weights
     * @returns {NeuralNetwork}
     */
    clone() {
        const nn = new NeuralNetwork(this.layerSizes);
        for (let l = 0; l < this.layers.length; l++) {
            const src = this.layers[l];
            const dst = nn.layers[l];
            for (let r = 0; r < src.weights.length; r++) {
                for (let c = 0; c < src.weights[r].length; c++) {
                    dst.weights[r][c] = src.weights[r][c];
                }
                dst.biases[r] = src.biases[r];
            }
        }
        return nn;
    }

    /**
     * In-place copy from another network (target network sync)
     * @param {NeuralNetwork} other
     */
    copyFrom(other) {
        for (let l = 0; l < this.layers.length; l++) {
            const src = other.layers[l];
            const dst = this.layers[l];
            for (let r = 0; r < src.weights.length; r++) {
                for (let c = 0; c < src.weights[r].length; c++) {
                    dst.weights[r][c] = src.weights[r][c];
                }
                dst.biases[r] = src.biases[r];
            }
        }
    }

    /**
     * Serialize to JSON-compatible object
     */
    toJSON() {
        return {
            layerSizes: this.layerSizes,
            layers: this.layers.map(l => ({
                weights: l.weights.map(row => row.slice()),
                biases: l.biases.slice(),
                activation: l.activation
            }))
        };
    }

    /**
     * Restore from JSON object
     * @param {Object} json - from toJSON()
     * @returns {NeuralNetwork}
     */
    static fromJSON(json) {
        const nn = new NeuralNetwork(json.layerSizes);
        for (let l = 0; l < json.layers.length; l++) {
            const src = json.layers[l];
            nn.layers[l].weights = src.weights.map(row => row.slice());
            nn.layers[l].biases = src.biases.slice();
            nn.layers[l].activation = src.activation;
        }
        return nn;
    }
}
