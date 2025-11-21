<?php

function sendEmail($to, $from, $subject, $message) {
    $headers = "From: " . $from . "\r\n";
    $headers .= 'Reply-To: ' . $to . "\r\n";
    $headers .= 'X-Mailer: PHP/' . phpversion();
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=iso-8859-1\r\n";

    return mail($to, $subject, $message, $headers);
}

$to = "info@leonardoschool.it";
$from = "info@leonardoschool.it";

function sanitizeInput($data) {
    return trim(htmlspecialchars($data));
}

$name = isset($_POST['name']) ? sanitizeInput($_POST['name']) : '';
$phone = isset($_POST['phone']) ? sanitizeInput($_POST['phone']) : '';
$email = isset($_POST['email']) ? sanitizeInput($_POST['email']) : '';
$messageContent = isset($_POST['message']) ? sanitizeInput($_POST['message']) : '';
$subject = isset($_POST['subject']) ? sanitizeInput($_POST['subject']) : '';
$tipoTest = isset($_POST['tipoTest']) ? sanitizeInput($_POST['tipoTest']) : '';
$selectedSubjects = isset($_POST['subjects']) ? array_map('sanitizeInput', $_POST['subjects']) : [];

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo "Errore: l'indirizzo email non è valido.";
    exit;
}

if (!empty($subject) && !empty($messageContent)) {
    if (empty($name) || empty($phone) || empty($messageContent)) {
        echo "Errore: tutti i campi sono obbligatori.";
        exit;
    }
    $message = "$name ha scritto:<br><br>$messageContent<br><br>Email: $email<br>Numero di telefono: $phone<br><br><br><br> inviato tramite sito";
    if (sendEmail($to, $from, $subject, $message)) {
        echo "Email inviata. Grazie " . $name . ", ti contatteremo presto.";
    } else {
        echo "Errore: l'email non è stata inviata.";
    }
} elseif (!empty($tipoTest)) {
    if (empty($name) || empty($phone)) {
        echo "Errore: tutti i campi sono obbligatori.";
        exit;
    }
    $subject = "Richiesta prenotazione Test";
    $message = "$name desidera prenotarsi per il test: $tipoTest<br><br>Numero di telefono: $phone<br>Email: $email<br><br><br><br> inviato tramite sito";
    if (sendEmail($to, $from, $subject, $message)) {
        echo "Email inviata. Grazie " . $name . ", ti contatteremo presto.";
    } else {
        echo "Errore: l'email non è stata inviata.";
    }
} elseif (!empty($selectedSubjects) && !empty($name) && !empty($phone) && !empty($messageContent)) {
    if (empty($selectedSubjects)) {
        echo "Errore: devi selezionare almeno una materia.";
        exit;
    }
    $subjectsList = implode(', ', $selectedSubjects);
    $subject = "Colloquio di assunzione Materie: " . $subjectsList;
    $message = "$name vorrebbe insegnare: $subjectsList<br><br>Numero di telefono: $phone<br><br>Breve descrizione di se stesso:<br><br>$messageContent<br><br><br><br> inviato tramite sito";
    if (sendEmail($to, $from, $subject, $message)) {
        echo "Email inviata. Grazie " . $name . ", ti contatteremo presto.";
    } else {
        echo "Errore: l'email non è stata inviata.";
    }
} else {
    echo "Errore: nessun tipo di richiesta valido.";
}
?>