<?php
// SMTP mailer untuk OTP reset password.
// Gmail/Google Workspace: smtp.gmail.com:587 + STARTTLS + App Password.

if (!function_exists('kirimEmailSmtp')) {
    function kirimEmailSmtp($to, $subject, $body) {
        $smtpHost = defined('SMTP_HOST') ? SMTP_HOST : (getenv('SMTP_HOST') ?: 'smtp.gmail.com');
        $smtpPort = defined('SMTP_PORT') ? (int) SMTP_PORT : (int)(getenv('SMTP_PORT') ?: 587);
        $smtpSecure = defined('SMTP_SECURE') ? strtolower(SMTP_SECURE) : strtolower(getenv('SMTP_SECURE') ?: 'tls');
        $smtpUser = defined('SMTP_USER') ? trim(SMTP_USER) : trim(getenv('SMTP_USER') ?: '');
        $smtpPass = defined('SMTP_PASS') ? trim(SMTP_PASS) : trim(getenv('SMTP_PASS') ?: '');
        $fromName = 'SIAKAD';

        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'error' => 'Alamat email penerima tidak valid.'];
        }
        if ($smtpUser === '' || $smtpPass === '') {
            return ['ok' => false, 'error' => 'SMTP_USER/SMTP_PASS belum dikonfigurasi.'];
        }
        if (!function_exists('fsockopen') || !function_exists('stream_socket_enable_crypto')) {
            return ['ok' => false, 'error' => 'Fungsi SMTP socket/TLS tidak tersedia di server.'];
        }

        // InfinityFree mengizinkan SMTP eksternal pada port 587.
        // Gunakan STARTTLS, jangan port 25.
        if ($smtpPort !== 587) {
            error_log('[SIAKAD SMTP] Port konfigurasi saat ini: ' . $smtpPort . '. Port 587 direkomendasikan untuk hosting ini.');
        }

        $errno = 0;
        $errstr = '';
        $timeout = 20;
        $sock = @fsockopen($smtpHost, $smtpPort, $errno, $errstr, $timeout);
        if (!$sock) {
            return ['ok' => false, 'error' => "Koneksi SMTP gagal ($smtpHost:$smtpPort): $errstr ($errno)"];
        }

        stream_set_timeout($sock, $timeout);
        $closed = false;

        $readResponse = function(array $expected) use ($sock) {
            $last = '';
            while (($line = fgets($sock, 2048)) !== false) {
                $last = rtrim($line, "\r\n");
                if (strlen($line) >= 4 && $line[3] === ' ') break;
            }
            $code = (int)substr($last, 0, 3);
            if (!in_array($code, $expected, true)) {
                throw new RuntimeException('SMTP ' . $code . ': ' . $last);
            }
            return $last;
        };

        $write = function($command) use ($sock) {
            $written = @fwrite($sock, $command . "\r\n");
            if ($written === false) throw new RuntimeException('Gagal menulis ke koneksi SMTP.');
        };

        try {
            $readResponse([220]);

            $write('EHLO siakad.local');
            $readResponse([250]);

            if ($smtpSecure !== 'tls' && $smtpSecure !== 'starttls') {
                throw new RuntimeException('SMTP_SECURE harus tls/starttls untuk port 587.');
            }

            $write('STARTTLS');
            $readResponse([220]);

            $crypto = @stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            if ($crypto !== true) {
                throw new RuntimeException('STARTTLS gagal mengaktifkan enkripsi TLS.');
            }

            $write('EHLO siakad.local');
            $readResponse([250]);

            $write('AUTH LOGIN');
            $readResponse([334]);
            $write(base64_encode($smtpUser));
            $readResponse([334]);
            $write(base64_encode($smtpPass));
            $readResponse([235]);

            $write('MAIL FROM:<' . $smtpUser . '>');
            $readResponse([250]);
            $write('RCPT TO:<' . $to . '>');
            $readResponse([250, 251]);
            $write('DATA');
            $readResponse([354]);

            // Dot-stuffing mencegah baris body yang diawali titik dianggap terminator SMTP.
            $safeBody = preg_replace('/(^|\r?\n)\./', '$1..', (string)$body);
            $headers =
                'Date: ' . date('r') . "\r\n" .
                'From: ' . $fromName . ' <' . $smtpUser . ">\r\n" .
                'To: <' . $to . ">\r\n" .
                'Subject: ' . (function_exists('mb_encode_mimeheader') ? mb_encode_mimeheader($subject, 'UTF-8', 'B') : $subject) . "\r\n" .
                "MIME-Version: 1.0\r\n" .
                "Content-Type: text/plain; charset=UTF-8\r\n" .
                "Content-Transfer-Encoding: 8bit\r\n\r\n";
            $payload = $headers . $safeBody . "\r\n.\r\n";
            if (@fwrite($sock, $payload) === false) {
                throw new RuntimeException('Gagal mengirim isi email.');
            }
            $readResponse([250]);

            $write('QUIT');
            @fclose($sock);
            $closed = true;
            return ['ok' => true];
        } catch (Throwable $e) {
            if (!$closed) @fclose($sock);
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }
}
