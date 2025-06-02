
import { type NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = body.url;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required and must be a string.' }, { status: 400 });
    }

    // Validate URL format (basic check)
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid URL format.' }, { status: 400 });
    }
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000, // 15 seconds timeout
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Extract title - common patterns
    const title = 
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('meta[name="twitter:title"]').attr('content')?.trim() ||
      $('head title').text()?.trim() ||
      $('h1').first().text()?.trim() ||
      $('.post-title').first().text()?.trim() ||
      $('.entry-title').first().text()?.trim();

    // Extract content - attempt common article containers
    let content = '';
    const contentSelectors = [
      'article .post-content', // Common in WordPress themes
      'article .entry-content', // Common in WordPress themes
      'article',
      '.post-content',
      '.entry-content',
      '#main-content',
      '[role="main"] .content',
      '[role="main"]',
      '.article-body',
      '.story-content',
    ];

    for (const selector of contentSelectors) {
      const selectedContent = $(selector).first();
      if (selectedContent.length) {
        // Clone and clean the content
        const $contentClone = selectedContent.clone();
        $contentClone.find('script, style, noscript, iframe, header, footer, nav, aside, .sidebar, .comments, .related-posts, .ad, .social-share, .author-bio, form, input, button, [aria-hidden="true"], .sr-only, .screen-reader-text, #comments, .comment-respond').remove();
        // Remove elements that are likely navigation or ads by common class names
        $contentClone.find('[class*="nav"], [class*="menu"], [class*="ads"], [class*="promo"], [class*="widget"], [id*="nav"], [id*="menu"], [id*="ads"], [id*="promo"], [id*="widget"]').remove();
        
        // Convert relative image URLs to absolute
        $contentClone.find('img').each((i, el) => {
          const img = $(el);
          let src = img.attr('src');
          if (src && !src.startsWith('http') && !src.startsWith('data:')) {
            try {
              src = new URL(src, url).href;
              img.attr('src', src);
            } catch (e) {
              // console.warn(`Could not resolve relative image URL: ${src} for base ${url}`);
            }
          }
          // Remove tiny images/spacers
          const width = parseInt(img.attr('width') || '0', 10);
          const height = parseInt(img.attr('height') || '0', 10);
          if ((width > 0 && width < 50) || (height > 0 && height < 50)) {
             img.remove();
          }
        });

        content = $contentClone.html() || '';
        if (content.trim()) break; 
      }
    }
    
    if (!content.trim() && $('body').length) { // Fallback to body if no specific content found
        const $bodyClone = $('body').clone();
        $bodyClone.find('script, style, noscript, iframe, header, footer, nav, aside, .sidebar, .comments, .related-posts, .ad, .social-share, .author-bio, form, input, button, [aria-hidden="true"], .sr-only, .screen-reader-text, #comments, .comment-respond').remove();
        $bodyClone.find('[class*="nav"], [class*="menu"], [class*="ads"], [class*="promo"], [class*="widget"], [id*="nav"], [id*="menu"], [id*="ads"], [id*="promo"], [id*="widget"]').remove();
        content = $bodyClone.html() || '';
    }


    // Extract featured image URL - common patterns
    let featuredImageUrl =
      $('meta[property="og:image"]').attr('content')?.trim() ||
      $('meta[name="twitter:image"]').attr('content')?.trim() ||
      $('article img').first().attr('src')?.trim() ||
      $('.featured-image img').first().attr('src')?.trim() ||
      $('#content img').first().attr('src')?.trim(); // A very general fallback

    if (featuredImageUrl && !featuredImageUrl.startsWith('http') && !featuredImageUrl.startsWith('data:')) {
      try {
        featuredImageUrl = new URL(featuredImageUrl, url).href;
      } catch (e) {
        // console.warn(`Could not resolve relative featured image URL: ${featuredImageUrl} for base ${url}`);
        featuredImageUrl = ''; // Invalidate if it cannot be resolved
      }
    }
    
    // Basic clean up of content (remove excessive newlines, though client editor might handle this)
    content = content.replace(/\n\s*\n/g, '\n').trim();

    return NextResponse.json({
      title: title || 'Untitled Post',
      content: content || '<p>Content could not be extracted.</p>',
      thumbnailUrl: featuredImageUrl || null,
    });

  } catch (error: any) {
    console.error("API Scraping error:", error.message);
    let errorMessage = 'Failed to scrape the URL.';
    let statusCode = 500;

    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorMessage = `Failed to fetch URL: ${error.response.status} ${error.response.statusText}. Check if the URL is accessible.`;
        statusCode = error.response.status;
      } else if (error.request) {
        errorMessage = 'Failed to fetch URL: No response received. The site might be down or blocking requests.';
        statusCode = 504; // Gateway Timeout
      } else {
        errorMessage = `Failed to fetch URL: ${error.message}`;
      }
    } else if (error.message.includes('Invalid URL')) {
        errorMessage = 'Invalid URL provided.';
        statusCode = 400;
    }
    
    return NextResponse.json({ error: errorMessage, details: error.message }, { status: statusCode });
  }
}
