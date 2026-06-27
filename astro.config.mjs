// @ts-check
import { unified } from '@astrojs/markdown-remark';
import { defineConfig } from 'astro/config';
import remarkToc from 'remark-toc';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build/config
export default defineConfig({
    markdown: {
        processor: unified({
            remarkPlugins: [
                remarkMath,
                [remarkToc, { heading: 'toc', maxDepth: 3 }],
            ],
            rehypePlugins: [rehypeKatex],
        }),
    },
    site: 'https://jmz.dev.br',
});
