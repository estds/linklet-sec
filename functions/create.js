/**
 * @api {post} /create Create
 */

function generateRandomString(length) {
    const characters = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }

    return result;
}

const translation = {
    'ZH': [
        'TOKEN 无效', // ZH[0]
        '缺少必要参数: url', // ZH[1]
        '参数格式无效: url', // ZH[2]
        '参数长度无效: slug, (>= 2 && <= 10), 或者以后缀名结尾', // ZH[3]
        '不可缩短本域名的网址', // ZH[4]
        'Slug 已经存在' // ZH[5]
    ],
    'EN': [
        'Invalid TOKEN', // EN[0]
        'Missing required parameter: url', //EN[1]
        'Illegal format: url', //EN[2]
        'Illegal length: slug, (>= 2 && <= 10), or not ending with a file extension', //EN[3]
        'You cannot shorten a link to the same domain', //EN[4]
        'Slug already exists' //EN[5]
    ]
};


export async function onRequest(context) {
    if (context.request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    const { request, env } = context;
    const originurl = new URL(request.url);
    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("clientIP");
    const userAgent = request.headers.get("user-agent");
    const origin = `${originurl.protocol}//${originurl.hostname}`

    const options = {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    const timedata = new Date();
    const formattedDate = new Intl.DateTimeFormat('en-US', options).format(timedata);
    const { url, slug, token, lang } = await request.json();
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    };
    let msgString = [];

    if ( lang === 'ZH') {
        msgString = translation.ZH;
    } else {
        msgString = translation.ZH;
    }

    // Check token
    if (!token || token !== env.ACCESS_TOKEN) {
        return Response.json({ message: msgString[0] }, {
            headers: corsHeaders,
            status: 403
        });
    }

    try {
        //const { url, slug } = await request.json();

        if (!url) {
            return Response.json({ 
                message: msgString[1] 
            }, {
                headers: corsHeaders,
                status: 400
            });
        }

        // URL format check
        if (!/^https?:\/\/.{3,}/.test(url)) {
            return Response.json({ 
                message: msgString[2]
            }, {
                headers: corsHeaders,
                status: 400
            });
        }

        // Custom slug length check
        if (slug && (slug.length < 2 || slug.length > 10 || /.+\.[a-zA-Z]+$/.test(slug))) {
            return Response.json({ 
                message: msgString[3]
            }, {
                headers: corsHeaders,
                status: 400
            });
        }

        // Check for self-referencing URLs
        const bodyUrl = new URL(url);
        if (bodyUrl.hostname === originurl.hostname) {
            return Response.json({ 
                message: msgString[4]
            }, {
                headers: corsHeaders,
                status: 400
            });
        }

        // If custom slug provided
        if (slug) {
            const stmt = await env.DB.prepare('SELECT url as existUrl FROM links WHERE slug = ?');
            const existUrl = await stmt.bind(slug).first();

            // Same URL & slug combination
            if (existUrl && existUrl.existUrl === url) {
                return Response.json({ 
                    slug, 
                    link: `${origin}/${slug}` 
                }, {
                    headers: corsHeaders
                });
            }

            // Slug already exists
            if (existUrl) {
                return Response.json({ 
                    message: msgString[5]
                }, {
                    headers: corsHeaders
                });
            }
        }

        // Check if URL already exists
        const stmt = await env.DB.prepare('SELECT slug as existSlug FROM links WHERE url = ?');
        const existSlug = await stmt.bind(url).first();

        // URL exists and no custom slug requested
        if (existSlug && !slug) {
            return Response.json({ 
                slug: existSlug.existSlug, 
                link: `${origin}/${existSlug.existSlug}` 
            }, {
                headers: corsHeaders
            });
        }

        // Generate or use provided slug, change slug length here
        const finalSlug = slug || generateRandomString(6);

        // Insert new link
        const insertStmt = await env.DB.prepare(`
            INSERT INTO links (url, slug, ip, status, ua, create_time) 
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        await insertStmt.bind(url, finalSlug, clientIP, 1, userAgent, formattedDate).run();

        return Response.json({ 
            slug: finalSlug, 
            link: `${origin}/${finalSlug}` 
        }, {
            headers: corsHeaders
        });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({ 
            message: 'Internal server error.' 
        }, {
            headers: corsHeaders,
            status: 500
        });
    }
}