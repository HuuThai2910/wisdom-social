$UTF8NoBOM = New-Object System.Text.UTF8Encoding($False)
$classMap = @{}

Get-ChildItem -Path "c:\Users\PC\Desktop\wisdom-social\backend\src\main\java\iuh\fit\edu\backend\modules" -Filter "*.java" -Recurse | ForEach-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName)
    if ($content -match 'package\s+(iuh\.fit\.edu\.backend\.modules\.[a-zA-Z0-9_.]+);') {
        $classMap[$_.BaseName] = $matches[1]
    }
}
Get-ChildItem -Path "c:\Users\PC\Desktop\wisdom-social\backend\src\main\java\iuh\fit\edu\backend\common" -Filter "*.java" -Recurse | ForEach-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName)
    if ($content -match 'package\s+(iuh\.fit\.edu\.backend\.common\.[a-zA-Z0-9_.]+);') {
        $classMap[$_.BaseName] = $matches[1]
    }
}

Get-ChildItem -Path "c:\Users\PC\Desktop\wisdom-social\backend\src" -Filter "*.java" -Recurse | ForEach-Object {
    $filePath = $_.FullName
    $lines = [System.IO.File]::ReadAllLines($filePath)
    $changed = $false
    
    for ($i = 0; $i -lt $lines.Length; $i++) {
        $line = $lines[$i]
        if ($line -match '^import\s+iuh\.fit\.edu\.backend\.dto\.(?:[a-zA-Z0-9_.]+\.)?([a-zA-Z0-9_]+);') {
            $className = $matches[1]
            if ($classMap.ContainsKey($className)) {
                $lines[$i] = "import " + $classMap[$className] + "." + $className + ";"
                $changed = $true
            }
        } elseif ($line -match '^import\s+iuh\.fit\.edu\.backend\.dto\.(.+)\.\*;') {
            $pkg = $matches[1]
            if ($pkg -eq 'request.user') { $lines[$i] = 'import iuh.fit.edu.backend.modules.user.dto.request.*;'; $changed = $true }
            if ($pkg -eq 'response.user') { $lines[$i] = 'import iuh.fit.edu.backend.modules.user.dto.response.*;'; $changed = $true }
            if ($pkg -eq 'request.page') { $lines[$i] = 'import iuh.fit.edu.backend.modules.page.dto.request.*;'; $changed = $true }
        }
    }
    
    if ($changed) {
        [System.IO.File]::WriteAllLines($filePath, $lines, $UTF8NoBOM)
    }
}
