import * as tf from '@tensorflow/tfjs-node';

class DataPreparation {
    scaler: tf.Layer;
    destinationEncoder: tf.layers.TextVectorization;
    preferenceEncoder: tf.layers.CategoryEncoding;

    constructor() {
        this.scaler = tf.layers.normalization();
        this.destinationEncoder = tf.layers.experimental.preprocessing.textVectorization({
            maxTokens: 10000,
            outputSequenceLength: 20,
        });
        this.preferenceEncoder = tf.layers.experimental.preprocessing.categoryEncoding({
            maxTokens: 100,
        });
    }

    createEmbeddings(destinations: string[], preferences: string[]): [tf.Tensor, tf.Tensor] {
        const destEmbeddings = this.destinationEncoder.apply(tf.tensor(destinations));
        const prefEmbeddings = this.preferenceEncoder.apply(tf.tensor(preferences));
        return [destEmbeddings, prefEmbeddings];
    }

    preprocessData(data: tf.Tensor): tf.Tensor {
        return this.scaler.apply(data);
    }

    prepareDataset(destinations: string[], preferences: string[], labels: number[]): tf.data.Dataset<tf.TensorContainer> {
        const [destEmb, prefEmb] = this.createEmbeddings(destinations, preferences);
        const features = tf.concat([destEmb, prefEmb], 1);
        const dataset = tf.data.array({ xs: features, ys: tf.tensor(labels) });
        return dataset.batch(32);
    }
}