$ErrorActionPreference = 'Continue'
$base = if ($env:MEDISPHERE_API) { $env:MEDISPHERE_API } else { 'http://localhost:8081/api' }
$script:pass = 0
$script:fail = 0
$script:report = @()

function Result($name, $ok, $detail = '') {
  if ($ok) { $script:pass++; $script:report += "PASS  $name $detail" }
  else     { $script:fail++; $script:report += "FAIL  $name $detail" }
}

function Login($email, $pw) {
  Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' `
    -Body (@{ email = $email; password = $pw } | ConvertTo-Json)
}

function AuthH($token) { @{ Authorization = "Bearer $token" } }

function TryReq($name, $method, $path, $headers, $body, $expectStatus) {
  try {
    $p = @{ Uri = "$base$path"; Method = $method; ContentType = 'application/json' }
    if ($headers) { $p.Headers = $headers }
    if ($null -ne $body) { $p.Body = ($body | ConvertTo-Json -Depth 8) }
    $r = Invoke-WebRequest @p -UseBasicParsing
    $ok = (-not $expectStatus) -or ($r.StatusCode -eq $expectStatus)
    Result $name $ok "status=$($r.StatusCode)"
    return $r
  } catch {
    $status = 'none'
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    $ok = $expectStatus -and ($status -eq $expectStatus)
    $msg = ''
    try { $msg = $_.Exception.Message.Substring(0, [Math]::Min(90, $_.Exception.Message.Length)) } catch { $msg = '' }
    Result $name $ok "status=$status expected=$expectStatus $msg"
    return $null
  }
}

function TryDenied($name, $method, $path, $headers, $body) {
  try {
    $p = @{ Uri = "$base$path"; Method = $method; ContentType = 'application/json' }
    if ($headers) { $p.Headers = $headers }
    if ($null -ne $body) { $p.Body = ($body | ConvertTo-Json -Depth 8) }
    Invoke-WebRequest @p -UseBasicParsing | Out-Null
    Result $name $false 'got 2xx (expected 401/403)'
  } catch {
    $status = 0
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    Result $name (($status -eq 401) -or ($status -eq 403)) "status=$status"
  }
}

# ---- Logins ----
$admin   = Login 'admin@medisphere.demo' 'Admin@12345'
$prov    = Login 'provider@medisphere.demo' 'Provider@123'
$care    = Login 'caremanager@medisphere.demo' 'Care@12345'
$patient = Login 'patient@medisphere.demo' 'Patient@123'
Result 'login admin'          ($null -ne $admin.accessToken)
Result 'login provider'       ($null -ne $prov.accessToken)
Result 'login care manager'   ($null -ne $care.accessToken)
Result 'login patient'        ($null -ne $patient.accessToken)
Result 'patient has patientId' ($null -ne $patient.user.patientId) $patient.user.patientId

$ah = AuthH $admin.accessToken
$ph = AuthH $prov.accessToken
$ch = AuthH $care.accessToken
$uh = AuthH $patient.accessToken
$ownId = $patient.user.patientId

# ---- Core reads ----
$patientsR = TryReq 'GET /patients' Get '/patients?size=5' $ah $null 200
$patients = $null
if ($patientsR) { $patients = $patientsR.Content | ConvertFrom-Json }
$patientCount = 0
if ($patients) { $patientCount = $patients.totalElements }
Result 'seed: 50+ patients' ($patientCount -ge 50) "count=$patientCount"
$targetId = $null
if ($patients -and $patients.content.Count -gt 0) { $targetId = $patients.content[0].id }

TryReq 'GET /patients/{id}' Get "/patients/$targetId" $ah $null 200 | Out-Null
TryReq 'GET /health-twins/{patientId}' Get "/health-twins/$targetId" $ah $null 200 | Out-Null
TryReq 'GET /vitals/{id}' Get "/vitals/$targetId" $ah $null 200 | Out-Null
TryReq 'GET /vitals/patient/{id}' Get "/vitals/patient/$targetId" $ah $null 200 | Out-Null
TryReq 'GET /labs/patient/{id}' Get "/labs/patient/$targetId" $ah $null 200 | Out-Null
TryReq 'GET /risk-predictions' Get '/risk-predictions' $ah $null 200 | Out-Null
TryReq 'GET /risk-predictions/patient/{id}' Get "/risk-predictions/patient/$targetId" $ah $null 200 | Out-Null
TryReq 'GET /care-plans' Get '/care-plans' $ah $null 200 | Out-Null
TryReq 'GET /care-plans/patient/{id}' Get "/care-plans/patient/$targetId" $ah $null 200 | Out-Null
TryReq 'GET /alerts' Get '/alerts' $ah $null 200 | Out-Null
TryReq 'GET /notifications' Get '/notifications' $ah $null 200 | Out-Null
TryReq 'GET /notifications/unread-count' Get '/notifications/unread-count' $ah $null 200 | Out-Null
TryReq 'GET /consents' Get '/consents' $ah $null 200 | Out-Null
TryReq 'GET /audit-logs' Get '/audit-logs' $ah $null 200 | Out-Null
TryReq 'GET /providers' Get '/providers' $ah $null 200 | Out-Null
TryReq 'GET /population-health' Get '/population-health' $ah $null 200 | Out-Null
TryReq 'GET /dashboard/summary' Get '/dashboard/summary' $ah $null 200 | Out-Null
TryReq 'GET /monitoring/summary' Get '/monitoring/summary' $ah $null 200 | Out-Null
TryReq 'GET /models' Get '/models' $ah $null 200 | Out-Null
TryReq 'GET /federated-learning' Get '/federated-learning' $ah $null 200 | Out-Null
TryReq 'GET /search' Get '/search?q=demo' $ah $null 200 | Out-Null
TryReq 'GET /reports' Get '/reports' $ah $null 200 | Out-Null
TryReq 'GET /settings/thresholds' Get '/settings/thresholds' $ah $null 200 | Out-Null

# ---- Seed counts ----
$fhirR = TryReq 'GET /fhir/resources' Get '/fhir/resources' $ah $null 200
$fhirCount = 0
if ($fhirR) { $fhirCount = ($fhirR.Content | ConvertFrom-Json).Count }
Result 'seed: FHIR resources' ($fhirCount -ge 100) "count=$fhirCount"

$alertR = TryReq 'GET /alerts (counted)' Get '/alerts?size=1' $ah $null 200
$alertCount = 0
if ($alertR) { $alertCount = ($alertR.Content | ConvertFrom-Json).totalElements }
Result 'seed: alerts' ($alertCount -ge 30) "count=$alertCount"

$cpR = TryReq 'GET /care-plans (counted)' Get '/care-plans' $ah $null 200
$cpCount = 0
if ($cpR) { $cpCount = ($cpR.Content | ConvertFrom-Json).Count }
Result 'seed: care plans' ($cpCount -ge 30) "count=$cpCount"

$riskR = TryReq 'GET /risk-predictions (counted)' Get '/risk-predictions' $ah $null 200
$riskCount = 0
if ($riskR) { $riskCount = ($riskR.Content | ConvertFrom-Json).Count }
Result 'seed: risk predictions' ($riskCount -ge 50) "count=$riskCount"

# ---- Risk prediction workflow ----
$pred = TryReq 'POST /risk-predictions/predict/{id}' Post "/risk-predictions/predict/$targetId" $ph $null 200
$predObj = $null
if ($pred) { $predObj = $pred.Content | ConvertFrom-Json }
Result 'prediction has score/category' (($null -ne $predObj) -and ($null -ne $predObj.overallScore) -and ($null -ne $predObj.riskCategory)) "$($predObj.riskCategory)"
$hasFactors = $false
if ($predObj -and ($predObj.contributingFactors -or $predObj.featureContributions -or $predObj.explanation -or $predObj.contributions)) { $hasFactors = $true }
Result 'prediction has explainability' $hasFactors
TryReq 'POST /risk-predictions/{patientId}/generate' Post "/risk-predictions/$targetId/generate" $ah $null 200 | Out-Null

# ---- Care plan workflow ----
$cpNew = TryReq 'POST /care-plans/generate' Post '/care-plans/generate' $ph @{ patientId = $targetId; goal = 'E2E test goal' } 200
$cpNewObj = $null
if ($cpNew) { $cpNewObj = $cpNew.Content | ConvertFrom-Json }
$cpId = $null
if ($cpNewObj) { $cpId = $cpNewObj.id }
Result 'care plan generated AI_GENERATED' (($null -ne $cpNewObj) -and ($cpNewObj.status -eq 'AI_GENERATED')) "$($cpNewObj.status)"
if ($cpId) {
  TryReq 'PUT /care-plans/{id} (modify)' Put "/care-plans/$cpId" $ph @{ goal = 'E2E updated goal'; notes = 'e2e edit' } 200 | Out-Null
  TryReq 'POST /care-plans/{id}/approve' Post "/care-plans/$cpId/approve" $ph @{ notes = 'e2e approve' } 200 | Out-Null
  TryReq 'POST /care-plans/{id}/sign' Post "/care-plans/$cpId/sign" $ph @{ notes = 'e2e sign' } 200 | Out-Null
  $cpCheck = TryReq 'GET /care-plans/{id} (after sign)' Get "/care-plans/$cpId" $ah $null 200
  if ($cpCheck) { $o = $cpCheck.Content | ConvertFrom-Json; Result 'care plan ACTIVE after sign' ($o.status -eq 'ACTIVE') $o.status }
}

# ---- Alerts workflow ----
$alertsResp = TryReq 'GET /alerts for transition' Get '/alerts?size=1' $ah $null 200
$alertsList = $null
if ($alertsResp) { $alertsList = $alertsResp.Content | ConvertFrom-Json }
if ($alertsList -and $alertsList.content.Count -gt 0) {
  $alertId = $alertsList.content[0].id
  TryReq 'POST /alerts/{id}/status ACK' Post "/alerts/$alertId/status" $ph @{ status = 'ACKNOWLEDGED'; note = 'e2e' } 200 | Out-Null
  TryReq 'POST /alerts/{id}/status RESOLVED' Post "/alerts/$alertId/status" $ph @{ status = 'RESOLVED'; note = 'e2e' } 200 | Out-Null
}

# ---- Vitals ingest ----
TryReq 'POST /vitals (ingest)' Post '/vitals' $ph @{ patientId = $targetId; type = 'HEART_RATE'; value = 155; unit = 'bpm'; timestamp = (Get-Date).ToUniversalTime().ToString('o') } 200 | Out-Null

# ---- FHIR ----
TryReq 'POST /fhir/validate (valid)' Post '/fhir/validate' $ah @{ resource = @{ resourceType = 'Patient'; id = 'x1'; name = @(@{ family = 'Test'; given = @('Synthetic') }) } } 200 | Out-Null
TryReq 'POST /fhir/import (invalid rejected 400)' Post '/fhir/import' $ah @{ resourceType = 'Patient' } 400 | Out-Null
TryReq 'POST /fhir/import (valid)' Post '/fhir/import' $ah @{ resourceType = 'Patient'; id = 'e2e-1'; name = @(@{ family = 'Synthetic'; given = @('E2E') }) } 200 | Out-Null

# ---- Consent ----
TryReq 'POST /consents upsert' Post '/consents' $ah @{ patientId = $targetId; category = 'DATA_SHARING'; status = 'GRANTED' } 200 | Out-Null

# ---- Settings thresholds ----
$th = TryReq 'POST /settings/thresholds' Post '/settings/thresholds' $ah @{ heartRateUpper = 105 } 200
if ($th) { $t = $th.Content | ConvertFrom-Json; Result 'threshold persisted' ($t.heartRateUpper -eq 105) "hr=$($t.heartRateUpper)" }

# ---- Auth: invalid token ----
try {
  Invoke-WebRequest -UseBasicParsing -Uri "$base/patients" -Headers @{ Authorization = 'Bearer invalid-token' } | Out-Null
  Result 'invalid token rejected' $false 'got 200'
} catch {
  $s = 0
  if ($_.Exception.Response) { $s = [int]$_.Exception.Response.StatusCode }
  Result 'invalid token rejected' ($s -eq 401) "status=$s"
}

# ---- RBAC: PATIENT restrictions ----
TryDenied 'PATIENT denied /audit-logs' Get '/audit-logs' $uh $null

$pl = $null
try { $pl = Invoke-RestMethod -Uri "$base/patients" -Headers $uh } catch { $pl = $null }
if ($pl) {
  $others = @($pl.content | Where-Object { $_.id -ne $ownId })
  Result 'PATIENT /patients scoped to own record' ($others.Count -eq 0) "others=$($others.Count) total=$($pl.totalElements)"
} else {
  Result 'PATIENT /patients scoped to own record' $false 'request failed'
}

if ($targetId -and $targetId -ne $ownId) {
  TryDenied 'PATIENT denied other patient 360' Get "/patients/$targetId" $uh $null
  TryDenied 'PATIENT denied other vitals' Get "/vitals/$targetId" $uh $null
  TryDenied 'PATIENT denied other labs' Get "/labs/$targetId" $uh $null
  TryDenied 'PATIENT denied other twin' Get "/health-twins/$targetId" $uh $null
  TryDenied 'PATIENT denied other care plans' Get "/care-plans/patient/$targetId" $uh $null
  TryDenied 'PATIENT denied other predictions' Get "/risk-predictions/patient/$targetId" $uh $null
}

TryDenied 'PATIENT denied model management' Get '/models' $uh $null
TryDenied 'PATIENT denied provider directory' Get '/providers' $uh $null
TryDenied 'PATIENT denied monitoring' Get '/monitoring/summary' $uh $null
TryDenied 'PATIENT denied population health' Get '/population-health' $uh $null
TryDenied 'PATIENT denied user list' Get '/users' $uh $null
TryDenied 'PATIENT denied FHIR import' Post '/fhir/import' $uh @{ resourceType = 'Patient'; id = 'p1' }
if ($cpId) { TryDenied 'PATIENT denied care plan approve' Post "/care-plans/$cpId/approve" $uh @{ notes = 'nope' } }

# PATIENT own data allowed
try { Invoke-WebRequest -UseBasicParsing -Uri "$base/patients/$ownId" -Headers $uh | Out-Null
      Result 'PATIENT can read own record' $true }
catch { $s = 0; if ($_.Exception.Response) { $s = [int]$_.Exception.Response.StatusCode }
        Result 'PATIENT can read own record' $false "status=$s" }

# ---- NURSE role (backend-enforced RBAC) ----
$nurse = $null
try { $nurse = Login 'nurse@medisphere.demo' 'Nurse@12345' } catch { $nurse = $null }
Result 'login nurse' ($null -ne $nurse.accessToken)
if ($nurse) {
  Result 'nurse role is NURSE' ($nurse.user.role -eq 'NURSE') $nurse.user.role
  $nh = AuthH $nurse.accessToken

  # allowed: the nursing surface
  TryReq 'NURSE GET /patients'                Get '/patients?size=5'            $nh $null 200 | Out-Null
  if ($targetId) { TryReq 'NURSE GET /patients/{id}' Get "/patients/$targetId"  $nh $null 200 | Out-Null }
  if ($targetId) { TryReq 'NURSE GET /vitals/patient/{id}' Get "/vitals/patient/$targetId" $nh $null 200 | Out-Null }
  TryReq 'NURSE GET /care-plans'              Get '/care-plans'                 $nh $null 200 | Out-Null
  TryReq 'NURSE GET /alerts'                  Get '/alerts'                     $nh $null 200 | Out-Null
  TryReq 'NURSE GET /monitoring/summary'      Get '/monitoring/summary'         $nh $null 200 | Out-Null
  TryReq 'NURSE GET /dashboard/summary'       Get '/dashboard/summary'          $nh $null 200 | Out-Null
  TryReq 'NURSE GET /notifications'           Get '/notifications'              $nh $null 200 | Out-Null

  # denied: administration, governance and model management
  TryDenied 'NURSE denied user list'          Get '/users'                      $nh $null
  TryReq    'NURSE reads provider directory'  Get '/providers'                  $nh $null 200 | Out-Null
  TryDenied 'NURSE denied provider create'    Post '/providers'                 $nh @{ name = 'nurse-created'; specialty = 'ward' }
  TryDenied 'NURSE denied model management'   Get '/models'                     $nh $null
  TryDenied 'NURSE denied audit log'          Get '/audit-logs'                 $nh $null
  TryDenied 'NURSE denied population health'  Get '/population-health'          $nh $null
  TryDenied 'NURSE denied FHIR import'        Post '/fhir/import'               $nh @{ resourceType = 'Patient'; id = 'p1' }

  if ($cpId) {
    TryDenied 'NURSE denied care plan sign'   Post "/care-plans/$cpId/sign"     $nh @{ notes = 'nurse sign' }
    TryDenied 'NURSE denied care plan approve' Post "/care-plans/$cpId/approve" $nh @{ notes = 'nurse approve' }
  }

  # nurse may refine a *draft* plan's operational content
  $np = $null
  if ($targetId) { $np = TryReq 'admin drafts a fresh plan' Post '/care-plans/generate' $ah @{ patientId = $targetId; goal = 'Nurse review target' } 200 }
  $npId = $null
  if ($np) { try { $npId = ($np.Content | ConvertFrom-Json).id } catch { $npId = $null } }
  if ($npId) {
    TryReq 'NURSE can update a draft care plan' Put "/care-plans/$npId" $nh @{ goal = 'Nurse-updated goal'; notes = 'observations added by the nurse' } 200 | Out-Null
  }
}

# ---- Refresh + register ----
try {
  $refresh = Invoke-RestMethod -Method Post -Uri "$base/auth/refresh" -ContentType 'application/json' `
    -Body (@{ refreshToken = $admin.refreshToken } | ConvertTo-Json)
  Result 'POST /auth/refresh' ($null -ne $refresh.accessToken)
} catch { Result 'POST /auth/refresh' $false $_.Exception.Message }

try {
  $regR = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType 'application/json' `
    -Body (@{ name = 'E2E Nurse'; email = "e2e.nurse.$(Get-Random)@example.demo"; password = 'Nurse@12345'; role = 'PROVIDER' } | ConvertTo-Json)
  Result 'POST /auth/register' ($null -ne $regR.accessToken)
} catch { Result 'POST /auth/register' $false $_.Exception.Message }

# ---- Register validation: short password rejected ----
try {
  Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$base/auth/register" -ContentType 'application/json' `
    -Body (@{ name = 'Bad'; email = "e2e.bad.$(Get-Random)@example.demo"; password = 'short' } | ConvertTo-Json) | Out-Null
  Result 'register rejects short password' $false 'got 2xx'
} catch { $s = 0; if ($_.Exception.Response) { $s = [int]$_.Exception.Response.StatusCode }
          Result 'register rejects short password' ($s -eq 400) "status=$s" }

Write-Output '================ E2E RESULTS ================'
$script:report | ForEach-Object { Write-Output $_ }
Write-Output "TOTAL: pass=$($script:pass) fail=$($script:fail)"
