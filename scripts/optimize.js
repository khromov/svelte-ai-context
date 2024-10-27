import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function optimizeContent() {
    // Define patterns to filter out
    const excludePatterns = [
        '/docs/svelte/legacy'
    ];
    
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
        
        // Store original count and size
        const originalCount = data.blocks.length;
        const originalSize = Buffer.from(JSON.stringify(data)).length;
        
        // Create new object with transformed blocks
        const optimizedData = {
            ...data,
            blocks: data.blocks
                .filter(block => {
                    // Filter out empty content
                    if (!block.content) return false;
                    
                    // Filter out excluded paths
                    if (block.href) {
                        return !excludePatterns.some(pattern => 
                            block.href.startsWith(pattern)
                        );
                    }
                    
                    return true;
                })
                .map(block => {
                    // Transform breadcrumbs to string format and rename to title
                    return {
                        title: Array.isArray(block.breadcrumbs) 
                            ? block.breadcrumbs.join(' > ')
                            : block.breadcrumbs,
                        content: block.content
                    };
                })
        };
        
        // Create formatted JSON
        const formattedJson = JSON.stringify(optimizedData, null, 2);
        
        // Create minified JSON
        const minifiedJson = JSON.stringify(optimizedData);
        
        // Save both versions
        const formattedPath = join(process.cwd(), 'content_optimized.json');
        const minifiedPath = join(process.cwd(), 'content_optimized_minified.json');
        
        await Promise.all([
            writeFile(formattedPath, formattedJson, 'utf8'),
            writeFile(minifiedPath, minifiedJson, 'utf8')
        ]);
        
        // Calculate sizes
        const formattedSize = Buffer.from(formattedJson).length;
        const minifiedSize = Buffer.from(minifiedJson).length;
        const sizeDifference = originalSize - formattedSize;
        const percentReduction = ((sizeDifference / originalSize) * 100).toFixed(2);
        const minifiedReduction = ((originalSize - minifiedSize) / originalSize * 100).toFixed(2);
        
        // Print statistics
        const removedCount = originalCount - optimizedData.blocks.length;
        console.log('Optimization complete:');
        console.log(`Original blocks: ${originalCount}`);
        console.log(`Filtered blocks: ${optimizedData.blocks.length}`);
        console.log(`Removed ${removedCount} blocks`);
        
        console.log('\nSize optimization:');
        console.log(`Original size: ${(originalSize / 1024).toFixed(2)} KB`);
        console.log('\nFormatted version:');
        console.log(`Size: ${(formattedSize / 1024).toFixed(2)} KB`);
        console.log(`Reduced by: ${(sizeDifference / 1024).toFixed(2)} KB (${percentReduction}%)`);
        console.log(`Saved to: ${formattedPath}`);
        
        console.log('\nMinified version:');
        console.log(`Size: ${(minifiedSize / 1024).toFixed(2)} KB`);
        console.log(`Reduced by: ${((originalSize - minifiedSize) / 1024).toFixed(2)} KB (${minifiedReduction}%)`);
        console.log(`Saved to: ${minifiedPath}`);
        
        console.log('\nExclude patterns used:');
        excludePatterns.forEach(pattern => console.log(` - ${pattern}`));

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