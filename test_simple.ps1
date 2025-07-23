# Test simple de soumission de stage
Write-Host "=== Test simple de soumission de stage ===" -ForegroundColor Green

# 1. Connexion
$loginBody = @{
    matricule = "64036STI45"
    password = "W*W?4quQA7aBTXF"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.token
    Write-Host "✅ Connexion réussie" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur de connexion: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Test de soumission avec tous les champs obligatoires
$headers = @{"Authorization" = "Bearer $token"}
$stageData = @{
    departement = "Dakar"
    commune = "Dakar"
    quartier = "Plateau"
    nomEntreprise = "Test Simple"
    dateDebutStage = "2024-02-01"
    themeMemoire = "Test simple"
    nomMaitreStage = "Jean"
    prenomMaitreStage = "Dupont"
    telephoneMaitreStage = "771234567"
    emailMaitreStage = "jean.dupont@test.com"
    fonctionMaitreStage = "Directeur"
    nomMaitreMemoire = "Prof Martin"
    telephoneMaitreMemoire = "775678901"
    emailMaitreMemoire = "martin@univ.sn"
    statutMaitreMemoire = "Professeur"
} | ConvertTo-Json

Write-Host "Données envoyées:" -ForegroundColor Yellow
Write-Host $stageData -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/internships/submit" -Method POST -Body $stageData -ContentType "application/json" -Headers $headers -UseBasicParsing
    Write-Host "✅ Soumission réussie!" -ForegroundColor Green
    Write-Host "Réponse: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur soumission: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorContent = $reader.ReadToEnd()
        Write-Host "Détails: $errorContent" -ForegroundColor Red
    }
}
