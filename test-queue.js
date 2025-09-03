const { Queue } = require('bullmq');
const fs = require('fs');
const path = require('path');

// Create Redis connection config
const connection = {
    host: 'localhost',
    port: 6369,
    password: 'erazor_admin123'
};

// Create queue instance
const imageProcessorQueue = new Queue('image-processor', { connection });

async function testQueue() {
    try {
        console.log('Testing queue connection...');
        
        // Create a dummy file buffer (1x1 pixel PNG)
        const dummyPngBuffer = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
            0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
            0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0x73, 0x75, 0x01, 0x18,
            0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);
        
        // Add a test job to the queue
        const job = await imageProcessorQueue.add('process-image', {
            clerkId: 'test-clerk-id',
            file: {
                originalname: 'test-image.png',
                mimetype: 'image/png',
                size: dummyPngBuffer.length,
                buffer: dummyPngBuffer.toString('base64'),
                filename: 'test-image.png'
            }
        });
        
        console.log(`Job added with ID: ${job.id}`);
        console.log('Job data:', job.data);
        
        // Wait a bit and check job status
        setTimeout(async () => {
            const updatedJob = await job.reload();
            console.log(`Job status: ${await updatedJob.getState()}`);
            
            // Close the queue
            await imageProcessorQueue.close();
            process.exit(0);
        }, 3000);
        
    } catch (error) {
        console.error('Error testing queue:', error);
        process.exit(1);
    }
}

testQueue();
