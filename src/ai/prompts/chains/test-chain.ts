import 'dotenv/config';
import { UnderstandingChain } from './understanding.chain.js';
import { ModelRouter } from '../../gateway/router/model.router.js';

async function testChain() {
    console.log('Testing UnderstandingChain...');
    
    const router = new ModelRouter({
        openaiKey: process.env.OPENAI_API_KEY,
        groqKey: process.env.GROQ_API_KEY,
        geminiKey: process.env.GEMINI_API_KEY,
        deepseekKey: process.env.DEEPSEEK_API_KEY,
        openrouterKey: process.env.OPENROUTER_API_KEY,
        mistralKey: process.env.MISTRAL_API_KEY,
    });

    const chain = new UnderstandingChain(router);
    const prompt = 'Build a high-performance e-commerce platform for a luxury watch brand with real-time inventory and a premium dashboard.';

    try {
        const result = await chain.run(prompt);
        console.log('Chain execution successful!');
        console.log('App Name:', result.appName);
        console.log('App Type:', result.appType);
        console.log('Features:', result.features);
        console.log('Entities:', result.entities);
    } catch (error) {
        console.error('Chain execution failed:', error);
    }
}

testChain();
