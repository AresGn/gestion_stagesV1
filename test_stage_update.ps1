# Test de mise à jour des informations de stage
Write-Host "=== Test de mise à jour des informations de stage ===" -ForegroundColor Green

# 1. Connexion pour obtenir le token
Write-Host "1. Connexion..." -ForegroundColor Yellow
$loginBody = @{
    matricule = "64036STI45"
    password = "W*W?4quQA7aBTXF"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.token
    $userId = $loginData.user.id
    Write-Host "✅ Connexion réussie - User ID: $userId" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur de connexion: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Vérification des informations actuelles
Write-Host "2. Récupération des informations actuelles..." -ForegroundColor Yellow
$headers = @{"Authorization" = "Bearer $token"}

try {
    $currentStageResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/internships/user/$userId" -Method GET -Headers $headers -UseBasicParsing
    $currentStage = $currentStageResponse.Content | ConvertFrom-Json
    Write-Host "✅ Informations actuelles récupérées" -ForegroundColor Green
    Write-Host "Entreprise actuelle: $($currentStage.data.nom_entreprise)" -ForegroundColor Cyan
    Write-Host "Thème actuel: $($currentStage.data.theme_memoire)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur récupération: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Mise à jour des informations
Write-Host "3. Mise à jour des informations..." -ForegroundColor Yellow
$updateData = @{
    departement = "Dakar"
    commune = "Dakar"
    quartier = "Plateau"
    nomEntreprise = "AGO Sarl - Mise à jour"
    dateDebutStage = "2025-03-15"
    dateFinStage = "2025-05-16"
    themeMemoire = "Thème mis à jour - Test local"
    nomMaitreStage = "AGOSSOUS"
    prenomMaitreStage = "Jean"
    telephoneMaitreStage = "01999343"
    emailMaitreStage = "agossous@gmail.com"
    fonctionMaitreStage = "DG"
    nomMaitreMemoire = "Lokossou"
    telephoneMaitreMemoire = "98098909"
    emailMaitreMemoire = "lokossous@gmail.com"
    statutMaitreMemoire = "permanent"
} | ConvertTo-Json

try {
    $updateResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/internships/submit" -Method POST -Body $updateData -ContentType "application/json" -Headers $headers -UseBasicParsing
    $updateResult = $updateResponse.Content | ConvertFrom-Json
    Write-Host "✅ Mise à jour réussie!" -ForegroundColor Green
    Write-Host "Message: $($updateResult.message)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur mise à jour: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Détails de l'erreur:" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorContent = $reader.ReadToEnd()
        Write-Host $errorContent -ForegroundColor Red
    }
    exit 1
}

# 4. Vérification des nouvelles informations
Write-Host "4. Vérification des nouvelles informations..." -ForegroundColor Yellow
try {
    $newStageResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/internships/user/$userId" -Method GET -Headers $headers -UseBasicParsing
    $newStage = $newStageResponse.Content | ConvertFrom-Json
    Write-Host "✅ Nouvelles informations récupérées" -ForegroundColor Green
    Write-Host "Nouvelle entreprise: $($newStage.data.nom_entreprise)" -ForegroundColor Cyan
    Write-Host "Nouveau thème: $($newStage.data.theme_memoire)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur vérification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "=== Test terminé ===" -ForegroundColor Green
