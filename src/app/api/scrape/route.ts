
import { type NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const elementsToRemove = [
  'script', 'style', 'noscript', 'iframe', 'header', 'footer', 'nav', 'aside',
  '.sidebar', '.comments', '.comment-form', '.comment-respond', '#comments', '#respond',
  '.related-posts', '.related_posts', 
  '.ad', '.ads', '.advert', '.advertisement', 
  '[class*="ad-"]', '[id*="ad-"]', 
  '[class*="-ad"]', '[id*="-ad"]', 
  '[class*="adsbygoogle"]', 
  '[class*="advertis"]', '[id*="advertis"]', 
  '[class*="sponsor"]', '[id*="sponsor"]', 
  '[class*="promo"]', '[id*="promo"]', 
  '[class*="widget"]', '[id*="widget"]', 
  '.social-share', '.social-links', '.share-buttons', 
  '.author-bio', '.author-box', 
  'form', 
  '[aria-hidden="true"]', 
  '.sr-only', '.screen-reader-text', 
  '[class*="nav"]', '[id*="nav"]',
  '[class*="menu"]', '[id*="menu"]',
  '[style*="display:none"]', '[style*="display: none"]',
  '[style*="visibility:hidden"]', '[style*="visibility: hidden"]',
  '[id*="cookie"]', '[class*="cookie"]',
  '[id*="gdpr"]', '[class*="gdpr"]',
  '[id*="popup"]', '[class*="popup"]', '[class*="modal"]', '[id*="modal"]',
  // More aggressive removals for "everything"
  '.header', '.footer', '.site-header', '.site-footer', '.main-nav', '.primary-nav', '.secondary-nav',
  '.breadcrumb', '.breadcrumbs', '.pagination', '.pager', '.subnav', '.flyout', '.dropdown',
  '.skip-link', '.skip-to-content', '.overlay', '.lightbox', '.banner', '.alert', '.notice',
  '.social', '.sharing', '.tools', '.actions', '.meta', '.entry-meta', '.post-meta',
  '.byline', '.author', '.timestamp', '.date', '.categories', '.tags', '.related',
  '#header', '#footer', '#sidebar', '#navigation', '#comments-section',
  'figure > figcaption', // Remove loose figcaptions, or figcaptions that are direct children of figure if desired.
  'dialog' // Remove dialog elements
].join(', ');

function cleanTitle(title: string, siteHostname: string): string {
  if (!title || !siteHostname) {
    return title;
  }

  let cleanedTitle = title;
  const lowerSiteHostname = siteHostname.toLowerCase().replace(/^www\./, '');
  const commonSeparators = ['|', '-', '–', ':']; 

  const escapedHostname = lowerSiteHostname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  const patterns = [];
  for (const sep of commonSeparators) {
    const escapedSep = sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    patterns.push(new RegExp(`^\\s*${escapedHostname}\\s*${escapedSep}\\s*`, 'i')); 
    patterns.push(new RegExp(`\\s*${escapedSep}\\s*${escapedHostname}\\s*$`, 'i')); 
  }
  patterns.push(new RegExp(`^\\s*${escapedHostname}\\s*`, 'i'));
  patterns.push(new RegExp(`\\s*${escapedHostname}\\s*$`, 'i'));


  for (const pattern of patterns) {
    cleanedTitle = cleanedTitle.replace(pattern, '');
  }
  
  const siteNameParts = lowerSiteHostname.split('.');
  if (siteNameParts.length > 1) {
    const primarySiteName = siteNameParts[0];
    const escapedPrimarySiteName = primarySiteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
     for (const sep of commonSeparators) {
        const escapedSep = sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        patterns.push(new RegExp(`^\\s*${escapedPrimarySiteName}\\s*${escapedSep}\\s*`, 'i')); 
        patterns.push(new RegExp(`\\s*${escapedSep}\\s*${escapedPrimarySiteName}\\s*$`, 'i')); 
    }
    patterns.push(new RegExp(`^\\s*${escapedPrimarySiteName}\\s*`, 'i'));
    patterns.push(new RegExp(`\\s*${escapedPrimarySiteName}\\s*$`, 'i'));

    for (const pattern of patterns) {
        cleanedTitle = cleanedTitle.replace(pattern, '');
    }
  }

  for (const sep of commonSeparators) {
     const escapedSep = sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
     cleanedTitle = cleanedTitle.replace(new RegExp(`^\\s*${escapedSep}\\s*`), '');
     cleanedTitle = cleanedTitle.replace(new RegExp(`\\s*${escapedSep}\\s*$`), '');
  }

  return cleanedTitle.trim();
}


export async function POST(request: NextRequest) {
  let requestUrlString: string;
  try {
    const body = await request.json();
    requestUrlString = body.url;

    if (!requestUrlString || typeof requestUrlString !== 'string') {
      return NextResponse.json({ error: 'URL is required and must be a string.' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(requestUrlString);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid URL format.' }, { status: 400 });
    }
    
    const response = await axios.get(requestUrlString, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000, 
    });

    const html = response.data;
    const $ = cheerio.load(html);

    let extractedTitle = 
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('meta[name="twitter:title"]').attr('content')?.trim() ||
      $('head title').text()?.trim() ||
      $('h1').first().text()?.trim() ||
      $('.post-title').first().text()?.trim() ||
      $('.entry-title').first().text()?.trim() ||
      'Untitled Post';
    
    extractedTitle = cleanTitle(extractedTitle, parsedUrl.hostname);

    let content = '';
    const contentSelectors = [
      'article .post-content', 
      'article .entry-content', 
      'article .article-content',
      'article .story-content',
      'article',
      '.post-content',
      '.entry-content',
      '.article-body',
      '.story-body',
      '#main-content',
      '#articleBody',
      '[itemprop="articleBody"]',
      '[role="main"] .content',
      '[role="main"]',
    ];

    for (const selector of contentSelectors) {
      const selectedElement = $(selector).first();
      if (selectedElement.length) {
        const $contentClone = selectedElement.clone();
        $contentClone.find(elementsToRemove).remove();
        
        $contentClone.find('img').each((i, el) => {
          const img = $(el);
          let src = img.attr('src');
          if (src && !src.startsWith('http') && !src.startsWith('data:')) {
            try {
              src = new URL(src, requestUrlString).href;
              img.attr('src', src);
            } catch (e) { /* console.warn(`Could not resolve relative image URL: ${src} for base ${requestUrlString}`); */ }
          }
          const width = parseInt(img.attr('width') || '0', 10);
          const height = parseInt(img.attr('height') || '0', 10);
          if ((width > 0 && width < 50) || (height > 0 && height < 50)) {
             img.remove();
          }
        });
        $contentClone.find('p, div, span').each((i, el) => {
          const element = $(el);
          if (element.html()?.trim() === '' && element.children().length === 0 && !element.attr('style')?.includes('background-image')) {
             element.remove();
          }
        });
        content = $contentClone.html() || '';
        if (content.trim().length > 200) break; 
      }
    }
    
    if (!content.trim() && $('body').length) { 
        const $bodyClone = $('body').clone();
        $bodyClone.find(elementsToRemove).remove();
        $bodyClone.find('img').each((i, el) => {
            const img = $(el);
            let src = img.attr('src');
            if (src && !src.startsWith('http') && !src.startsWith('data:')) {
              try {
                src = new URL(src, requestUrlString).href;
                img.attr('src', src);
              } catch (e) { /* empty */ }
            }
        });
        $bodyClone.find('p, div, span').each((i, el) => {
          const element = $(el);
          if (element.html()?.trim() === '' && element.children().length === 0 && !element.attr('style')?.includes('background-image')) {
             element.remove();
          }
        });
        content = $bodyClone.html() || '';
    }

    let featuredImageUrl =
      $('meta[property="og:image"]').attr('content')?.trim() ||
      $('meta[name="twitter:image"]').attr('content')?.trim() ||
      $('article img').first().attr('src')?.trim() ||
      $('.featured-image img').first().attr('src')?.trim() ||
      $('#content img').first().attr('src')?.trim(); 

    if (featuredImageUrl && !featuredImageUrl.startsWith('http') && !featuredImageUrl.startsWith('data:')) {
      try {
        featuredImageUrl = new URL(featuredImageUrl, requestUrlString).href;
      } catch (e) {
        featuredImageUrl = undefined; // Set to undefined if resolution fails
      }
    }
    
    let thumbnailDataUri: string | null = null;
    if (featuredImageUrl) {
      try {
        const imageResponse = await axios.get(featuredImageUrl, { 
          responseType: 'arraybuffer',
          timeout: 10000, // Timeout for image download
        });
        const contentType = imageResponse.headers['content-type'] || 'image/jpeg'; // Default to jpeg
        const imageBuffer = Buffer.from(imageResponse.data);
        thumbnailDataUri = `data:${contentType};base64,${imageBuffer.toString('base64')}`;
      } catch (imgError: any) {
        console.warn(`Failed to download scraped image ${featuredImageUrl}: ${imgError.message}`);
        thumbnailDataUri = null; // Set to null if image download fails
      }
    }
    
    content = content.replace(/\n\s*\n/g, '\n').trim();

    return NextResponse.json({
      title: extractedTitle || 'Untitled Post',
      content: content || '<p>Content could not be extracted or was empty after cleaning.</p>',
      thumbnailUrl: featuredImageUrl || null, // Keep original URL for reference if needed
      thumbnailDataUri: thumbnailDataUri, // This will be used by the client
    });

  } catch (error: any) {
    console.error("API Scraping error:", error.message);
    let errorMessage = 'Failed to scrape the URL.';
    let statusCode = 500;
    let errorDetails = error.message;

    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorMessage = `Failed to fetch URL: ${error.response.status} ${error.response.statusText}. Check if the URL is accessible and not blocking requests.`;
        statusCode = error.response.status >= 400 ? error.response.status : 500;
      } else if (error.request) {
        errorMessage = 'Failed to fetch URL: No response received. The site might be down or blocking requests.';
        statusCode = 504; 
      } else {
        errorMessage = `Failed to fetch URL: ${error.message}`;
      }
    } else if (error.message.includes('Invalid URL')) {
        errorMessage = 'Invalid URL provided.';
        statusCode = 400;
    } else {
      errorDetails = error.message || 'An unexpected error occurred during scraping.';
    }
    
    return NextResponse.json({ error: errorMessage, details: errorDetails, from: 'api-scrape' }, { status: statusCode });
  }
}

