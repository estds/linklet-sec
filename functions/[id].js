/**
 * @param {string} slug
 */
import page404 from './404.html'

export async function onRequestGet(context) {
    const { request, env, params } = context;
    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("clientIP");
    const userAgent = request.headers.get("user-agent");
    const referer = request.headers.get('Referer') || "Referer";
    
    const options = {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    const timedata = new Date();
    const formattedDate = new Intl.DateTimeFormat('zh-CN', options).format(timedata);

    const slug = params.id;

    try {
        // Safely query for URL using parameterized query
        const stmt = await env.DB.prepare('SELECT url FROM links WHERE slug = ?');
        const url = await stmt.bind(slug).first();

        if (!url) {
            return new Response(page404, {
                status: 404,
                headers: {
                    "content-type": "text/html;charset=UTF-8",
                }
            });
        }

        try {
            // Log the access using parameterized query
            const logStmt = await env.DB.prepare(`
                INSERT INTO logs (url, slug, ip, referer, ua, create_time) 
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            await logStmt.bind(
                url.url,
                slug,
                clientIP,
                referer,
                userAgent,
                formattedDate
            ).run();

            return Response.redirect(url.url, 302);
            
        } catch (error) {
            // If logging fails, still redirect the user
            console.error('Error logging redirect:', error);
            return Response.redirect(url.url, 302);
        }
    } catch (error) {
        console.error('Error processing redirect:', error);
        return new Response(page404, {
            status: 404,
            headers: {
                "content-type": "text/html;charset=UTF-8",
            }
        });
    }
}