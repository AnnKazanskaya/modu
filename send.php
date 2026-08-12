<?php
/* ============================================================
   modu — приём заявок с сайта и отправка в Telegram
   ------------------------------------------------------------
   НАСТРОЙКА (2 минуты):
   1) В Telegram напишите @BotFather → /newbot → придумайте имя →
      получите ТОКЕН вида 1234567890:AAExxxxxxxxxxxxxxxxxxxxx
   2) Напишите своему новому боту любое сообщение («привет»),
      затем напишите @userinfobot — он пришлёт ваш ID (число).
   3) Вставьте токен и ID в две строки ниже и сохраните файл.
   ============================================================ */

$BOT_TOKEN = 'ВСТАВЬТЕ_ТОКЕН_БОТА';   // напр. '1234567890:AAExxxxxxxxxx'
$CHAT_ID   = 'ВСТАВЬТЕ_ВАШ_ID';        // напр. '123456789'

header('Content-Type: application/json; charset=utf-8');

// данные из формы (JSON или обычный POST)
$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) { $data = $_POST; }

// антиспам: скрытое поле-ловушка
if (!empty($data['website'])) { echo json_encode(['ok' => true]); exit; }

$text = isset($data['text']) ? trim($data['text']) : '';
if ($text === '' || mb_strlen($text) > 4000) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'empty']);
  exit;
}

$message = "🛋 Новая заявка с сайта modu\n\n" . $text;

$payload = http_build_query([
  'chat_id' => $CHAT_ID,
  'text'    => $message,
  'disable_web_page_preview' => true,
]);

$ch = curl_init("https://api.telegram.org/bot{$BOT_TOKEN}/sendMessage");
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST           => true,
  CURLOPT_POSTFIELDS     => $payload,
  CURLOPT_TIMEOUT        => 15,
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code === 200) {
  echo json_encode(['ok' => true]);
} else {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'telegram']);
}
