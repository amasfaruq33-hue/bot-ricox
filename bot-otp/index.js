const https = require('https');

const TELEGRAM_TOKEN = '8727991980:AAH0lpHRWyosW-eZE3Nr2SiTVFhIrE157Y';
const TELEGRAM_CHAT_ID = '8695086216';

module.exports = async (req, res) => {
    // Hanya izinkan method POST
    if (req.method !== 'POST') {
        res.statusCode = 405;
        return res.end('Method Not Allowed');
    }

    try {
        const data = req.body;

        if (!data) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }

        const event = data.event || '';

        if (event === 'otp.received' || event === 'test.webhook') {
            const service = data.service || 'Unknown';
            const phone = data.phone || '-';
            const otpCode = data.otp_code || '-';
            const smsText = data.sms_text || '-';

            // Format pesan ke Telegram
            let pesan = "🔔 *NOTIFIKASI OTP MASUK!*\n\n";
            pesan += `📱 Layanan: ${service.toUpperCase()}\n`;
            pesan += `📞 No HP: \`${phone}\`\n`;
            pesan += `🔑 Kode OTP: *${otpCode}*\n`;
            pesan += `💬 SMS: ${smsText}`;

            await sendTelegramMessage(TELEGRAM_CHAT_ID, pesan);
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: "success" }));

    } catch (error) {
        console.error(error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
};

// Fungsi pengirim pesan ke Telegram
function sendTelegramMessage(chatId, text) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        });

        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${TELEGRAM_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(body));
        });

        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}