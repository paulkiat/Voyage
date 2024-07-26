import * as tf from '@tensorflow/tfjs-node';

class RealTimeDataIntegrator {
    dataSources: any[];
    lock: any;
    latestData: any;

    constructor() {
        this.dataSources = [];
        this.lock = new tf.Mutex();
        this.latestData = {};
    }

    addDataSource(source: any): void {
        this.dataSources.push(source);
    }

    async updateData(): Promise<void> {
        while (true) {
            const newData: any = {};
            for (const source of this.dataSources) {
                Object.assign(newData, await source.getData());
            }
            await this.lock.lock();
            this.latestData = newData;
            this.lock.unlock();
            await new Promise((resolve) => setTimeout(resolve, 60000));  // Update every minute
        }
    }

    async getRealTimeData(): Promise<any> {
        await this.lock.lock();
        const data = { ...this.latestData };
        this.lock.unlock();
        return data;
    }

    start(): void {
        this.updateData();
    }
}