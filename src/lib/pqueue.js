// Promise Queue class to manage max N concurrency for AI Travel Companion

class PromiseQueue {
    constructor(options = {}) {
        this.options = options;
        this.maxConcurrency = options.concurrent || 2;
        this.taskQueue = {};
        this.nextId = 1;
        this.currentSize = 0;
        this.waitingPromises = [];
    }

    // Helper method to wait until a slot is available
    async waitForSlot() {
        return new Promise(resolve => this.waitingPromises.push(resolve));
    }

    // Add a new task to the queue
    async addTask(promise) {
        const { taskQueue, maxConcurrency, waitingPromises } = this;
        if (this.currentSize >= maxConcurrency) {
            await this.waitForSlot();
        }
        this.currentSize++;
        const taskId = this.nextId++;
        taskQueue[taskId] = promise;
        promise.then(() => {
            delete taskQueue[taskId];
            this.currentSize--;
            if (waitingPromises.length) {
                waitingPromises.shift()();
            }
        });
    }

    // Wait for all tasks to complete
    async drainQueue() {
        while (this.currentSize) {
            await this.waitForSlot();
        }
    }
}

module.exports = { PromiseQueue };