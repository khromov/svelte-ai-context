import { readFile } from 'fs/promises';
import { join } from 'path';

async function extractHrefs() {
    try {
        // Read the JSON file from the current directory
        const filePath = join(process.cwd(), 'content.json');
        const jsonContent = await readFile(filePath, 'utf8');
        
        // Parse the JSON content
        const data = JSON.parse(jsonContent);
        
        // Check if the data has the expected structure
        if (!data.blocks || !Array.isArray(data.blocks)) {
            throw new Error('Invalid JSON structure: expected "blocks" array');
        }
        
        // Extract and print all hrefs
        console.log('Found hrefs:');
        data.blocks
            .filter(block => block.href)
            .forEach((block, index) => {
                console.log(`${index + 1}. ${block.href}`);
            });

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error('Error: content.json file not found in current directory');
        } else if (error instanceof SyntaxError) {
            console.error('Error: Invalid JSON format in content.json');
        } else {
            console.error('Error:', error.message);
        }
        process.exit(1);
    }
}

// Run the function
extractHrefs();