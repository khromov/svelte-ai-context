import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function optimizeContent() {
    // Define patterns to filter out
    const excludePatterns = [
        '/docs/svelte/legacy',
        '/tutorial'
    ];
    
    // Define the chapter structure
    const chapterStructure = {
        'Docs > SvelteKit': [
            'Getting started',
            'Core concepts',
            'Advanced',
            'Build and deploy',
            'Best practices'
        ],
        'Docs > Svelte': [
            'Introduction',
            'Runes',
            'Template syntax',
            'Styling',
            'Special elements',
            'Runtime',
            'Advanced',
            'Testing',
            'TypeScript',
            'Custom elements',
            'Packaging'
        ]
    };
    
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
        
        // Initialize chapter structure
        const chapters = {};
        Object.entries(chapterStructure).forEach(([mainChapter, subChapters]) => {
            chapters[mainChapter] = {};
            subChapters.forEach(subChapter => {
                chapters[mainChapter][subChapter] = [];
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
                const breadcrumbs = Array.isArray(block.breadcrumbs) 
                    ? block.breadcrumbs.join(' > ')
                    : block.breadcrumbs;
                
                // Find matching main chapter
                const mainChapter = Object.keys(chapterStructure).find(chapter => 
                    breadcrumbs.startsWith(chapter)
                );
                
                if (mainChapter) {
                    // Remove main chapter from breadcrumbs
                    const remainingPath = breadcrumbs.replace(mainChapter + ' > ', '');
                    
                    // Find matching subchapter
                    const subChapter = chapterStructure[mainChapter].find(sub => 
                        remainingPath.startsWith(sub)
                    );
                    
                    if (subChapter) {
                        // Remove subchapter from the remaining path to get the final title
                        const title = remainingPath.replace(subChapter + ' > ', '');
                        
                        chapters[mainChapter][subChapter].push({
                            title,
                            content: block.content
                        });
                    }
                }
            });
        
        // Convert to array structure, removing empty chapters and subchapters
        const optimizedData = Object.entries(chapters)
            .map(([mainChapter, subChapters]) => {
                const nonEmptySubChapters = Object.entries(subChapters)
                    .filter(([_, blocks]) => blocks.length > 0)
                    .map(([subChapter, blocks]) => ({
                        section: subChapter,
                        blocks
                    }));
                
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
        console.log('\nChapter statistics:');
        Object.entries(chapters).forEach(([mainChapter, subChapters]) => {
            console.log(`\n${mainChapter}:`);
            Object.entries(subChapters).forEach(([subChapter, blocks]) => {
                if (blocks.length > 0) {
                    console.log(`  ${subChapter}: ${blocks.length} blocks`);
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