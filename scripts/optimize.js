import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function optimizeContent() {
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
        
        // Create new object with filtered blocks
        const optimizedData = {
            ...data,
            blocks: data.blocks.filter(block => block.content)
        };
        
        // Save to new file
        const outputPath = join(process.cwd(), 'content_optimized.json');
        await writeFile(
            outputPath, 
            JSON.stringify(optimizedData, null, 2), 
            'utf8'
        );
        
        // Print statistics
        console.log('Optimization complete:');
        console.log(`Original blocks: ${data.blocks.length}`);
        console.log(`Filtered blocks: ${optimizedData.blocks.length}`);
        console.log(`Removed ${data.blocks.length - optimizedData.blocks.length} blocks`);
        console.log(`Output saved to: ${outputPath}`);

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
optimizeContent();