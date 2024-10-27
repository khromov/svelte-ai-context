import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function optimizeContent() {
    // Define patterns to filter out
    const excludePatterns = [
        '/docs/svelte/legacy',
        '/docs/kit/migrating',
        '/tutorial'
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
        
        // Store original size
        const originalSize = Buffer.from(JSON.stringify(data)).length;
        
        // First, analyze the breadcrumbs to build the structure
        const chapterStructure = new Map();
        data.blocks.forEach(block => {
            if (!Array.isArray(block.breadcrumbs) || block.breadcrumbs.length < 3) return;
            
            // Get the first three levels
            const [level1, level2, level3] = block.breadcrumbs;
            const mainChapter = `${level1} > ${level2}`;
            
            if (!chapterStructure.has(mainChapter)) {
                chapterStructure.set(mainChapter, new Set());
            }
            chapterStructure.get(mainChapter).add(level3);
        });
        
        // Initialize chapter structure based on the analysis
        const chapters = {};
        chapterStructure.forEach((sections, mainChapter) => {
            chapters[mainChapter] = {};
            sections.forEach(section => {
                chapters[mainChapter][section] = [];
            });
        });
        
        // Filter and transform blocks
        data.blocks
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
            .forEach(block => {
                if (!Array.isArray(block.breadcrumbs) || block.breadcrumbs.length < 4) return;
                
                // Extract the different levels
                const [level1, level2, level3, ...restLevels] = block.breadcrumbs;
                const mainChapter = `${level1} > ${level2}`;
                const section = level3;
                
                // Create the title from the remaining levels
                const title = restLevels.join(' > ');
                
                // Add to the appropriate section if it exists
                if (chapters[mainChapter]?.[section]) {
                    chapters[mainChapter][section].push({
                        title,
                        content: block.content
                    });
                }
            });
        
        // Convert to array structure and merge content
        const optimizedData = Object.entries(chapters)
            .map(([mainChapter, subChapters]) => {
                const nonEmptySubChapters = Object.entries(subChapters)
                    .filter(([_, blocks]) => blocks.length > 0)
                    .map(([subChapter, blocks]) => {
                        // Merge all blocks into a single markdown string
                        const mergedContent = blocks
                            .map(block => `### ${block.title}\n\n${block.content}\n`)
                            .join('\n');
                        
                        return {
                            section: subChapter,
                            content: mergedContent.trim()
                        };
                    });
                
                return {
                    chapter: mainChapter,
                    sections: nonEmptySubChapters
                };
            })
            .filter(chapter => chapter.sections.length > 0);
        
        // Create formatted and minified versions
        const formattedJson = JSON.stringify(optimizedData, null, 2);
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
        const percentReduction = ((originalSize - minifiedSize) / originalSize * 100).toFixed(2);
        
        // Print statistics
        console.log('Optimization complete:');
        console.log('\nChapter structure found:');
        chapterStructure.forEach((sections, mainChapter) => {
            console.log(`\n${mainChapter}:`);
            sections.forEach(section => {
                const blockCount = chapters[mainChapter][section].length;
                if (blockCount > 0) {
                    console.log(`  ${section}: ${blockCount} blocks`);
                }
            });
        });
        
        console.log('\nSize optimization:');
        console.log(`Original size: ${(originalSize / 1024).toFixed(2)} KB`);
        console.log('\nFormatted version:');
        console.log(`Size: ${(formattedSize / 1024).toFixed(2)} KB`);
        console.log(`Saved to: ${formattedPath}`);
        
        console.log('\nMinified version:');
        console.log(`Size: ${(minifiedSize / 1024).toFixed(2)} KB`);
        console.log(`Reduced by: ${((originalSize - minifiedSize) / 1024).toFixed(2)} KB (${percentReduction}%)`);
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