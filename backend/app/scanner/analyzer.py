# D:\My_Work\smartShiledAI\backend\app\scanner\analyzer.py
import re
from typing import List, Dict, Any, Set, Tuple
from dataclasses import dataclass
from enum import Enum

class RiskLevel(Enum):
    CRITICAL = "🔴 CRITICAL"
    HIGH = "🟠 HIGH"
    MEDIUM = "🟡 MEDIUM"
    LOW = "🔵 LOW"
    INFO = "⚪ INFO"
    SAFE = "🟢 SAFE"

@dataclass
class Vulnerability:
    issue: str
    severity: RiskLevel
    description: str
    fix: str
    line_numbers: List[int]
    code_snippet: str
    cwe_reference: str = ""
    impact: str = ""
    likelihood: str = ""

class SmartContractAnalyzer:
    def __init__(self, code: str):
        self.code = code
        self.lines = code.split('\n')
        self.vulnerabilities = []
        self.security_score = 100
        self.contract_name = self._extract_contract_name()
        self.pragma_version = self._extract_pragma()
        
    def _extract_contract_name(self) -> str:
        """Extract contract name from code"""
        match = re.search(r'contract\s+(\w+)', self.code)
        return match.group(1) if match else "Unknown Contract"
    
    def _extract_pragma(self) -> str:
        """Extract Solidity version pragma"""
        match = re.search(r'pragma\s+solidity\s+([^;]+)', self.code)
        return match.group(1) if match else "Not specified"
    
    def _find_lines(self, pattern: str) -> List[int]:
        """Find line numbers matching a pattern"""
        lines = []
        for i, line in enumerate(self.lines, 1):
            if re.search(pattern, line):
                lines.append(i)
        return lines
    
    def _get_code_snippet(self, line_numbers: List[int], context: int = 2) -> str:
        """Get code snippet around vulnerable lines"""
        if not line_numbers:
            return ""
        
        start_line = max(1, min(line_numbers) - context)
        end_line = min(len(self.lines), max(line_numbers) + context)
        
        snippet = []
        for i in range(start_line - 1, end_line):
            line_num = i + 1
            prefix = ">> " if line_num in line_numbers else "   "
            snippet.append(f"{prefix}{line_num}: {self.lines[i]}")
        
        return '\n'.join(snippet)

    # ==================== CRITICAL VULNERABILITIES (🔴) ====================
    
    def check_reentrancy(self):
        """Check for reentrancy vulnerabilities - FIXED"""
        # Find external calls
        call_patterns = [
            (r'\.call\s*\{[^\}]*\}\s*\([^\)]*\)', "call()"),
            (r'\.send\s*\([^\)]*\)', "send()"),
            (r'\.transfer\s*\([^\)]*\)', "transfer()")
        ]
        
        for pattern, call_type in call_patterns:
            call_lines = self._find_lines(pattern)
            
            for call_line in call_lines:
                # Find the function containing this call
                function_start = self._find_function_start(call_line)
                function_end = self._find_function_end(function_start)
                
                # Look for state changes AFTER the call
                state_change_after = False
                state_change_lines = []
                
                for i in range(call_line + 1, min(function_end, call_line + 15)):
                    if re.search(r'(balances\[|\.\w+\s*=|\+=|-=|\*=|/=)', self.lines[i-1]):
                        if not re.search(r'require\(|if.*revert|return', self.lines[i-1]):  # Ignore checks
                            state_change_after = True
                            state_change_lines.append(i)
                
                # Look for state changes BEFORE the call (this is safe)
                state_change_before = False
                for i in range(max(function_start, call_line - 10), call_line):
                    if re.search(r'(balances\[|\.\w+\s*=|\+=|-=|\*=|/=)', self.lines[i-1]):
                        state_change_before = True
                
                # If state changes AFTER call and NOT before, it's reentrancy vulnerable
                if state_change_after and not state_change_before:
                    self.vulnerabilities.append(Vulnerability(
                        issue="Critical Reentrancy Vulnerability",
                        severity=RiskLevel.CRITICAL,
                        description=f"External {call_type} before state update. Contract makes an external call and then modifies state, allowing reentrancy attacks.",
                        fix="1. Use Checks-Effects-Interactions pattern\n2. Use OpenZeppelin's ReentrancyGuard\n3. Move all state changes before external calls",
                        line_numbers=[call_line] + state_change_lines,
                        code_snippet=self._get_code_snippet([call_line] + state_change_lines[:2]),
                        cwe_reference="CWE-841",
                        impact="Attackers can drain contract funds",
                        likelihood="High"
                    ))
                    self.security_score -= 30
                    break  # Found reentrancy, move to next call

    def check_unchecked_external_calls(self):
        """Check for unchecked external calls - FIXED"""
        patterns = [
            (r'\.call\s*\([^\)]*\)(?!\s*\.\s*success)', "call()"),
            (r'\.delegatecall\s*\([^\)]*\)(?!\s*\.\s*success)', "delegatecall()"),
            (r'\.send\s*\([^\)]*\)(?!\s*\.\s*success)', "send()")
        ]
        
        for pattern, call_type in patterns:
            lines = self._find_lines(pattern)
            for line_num in lines:
                # Check if this line is part of a require statement or has success check
                line = self.lines[line_num-1]
                
                # Check if it's already inside a require
                is_checked = False
                
                # Look for require with success in same line or next few lines
                if 'require(success)' in line or 'require(' in line and 'success' in line:
                    is_checked = True
                
                # Check next 3 lines for require(success)
                if not is_checked:
                    for i in range(line_num, min(line_num + 4, len(self.lines))):
                        if re.search(r'require\s*\(\s*success', self.lines[i-1]):
                            is_checked = True
                            break
                
                if not is_checked:
                    self.vulnerabilities.append(Vulnerability(
                        issue=f"Unchecked External {call_type}",
                        severity=RiskLevel.CRITICAL,
                        description=f"Unchecked {call_type} without checking return value. The call might fail silently.",
                        fix="Always check return value: require(success) or if(!success) revert()",
                        line_numbers=[line_num],
                        code_snippet=self._get_code_snippet([line_num]),
                        cwe_reference="CWE-252",
                        impact="Function may continue execution after failed call",
                        likelihood="Medium"
                    ))
                    self.security_score -= 25

    def check_selfdestruct(self):
        """Check for selfdestruct usage - FIXED"""
        lines = self._find_lines(r'selfdestruct|suicide')
        if lines:
            # Check if there's access control
            has_access_control = False
            for line_num in lines:
                # Look for onlyOwner or require statements before selfdestruct
                for i in range(max(1, line_num-10), line_num):
                    line = self.lines[i-1]
                    if re.search(r'onlyOwner|require\s*\(\s*msg\.sender\s*==|if\s*\(\s*msg\.sender\s*==', line):
                        has_access_control = True
                        break
            
            severity = RiskLevel.HIGH if not has_access_control else RiskLevel.MEDIUM
            score_impact = 20 if not has_access_control else 10
            
            self.vulnerabilities.append(Vulnerability(
                issue="Selfdestruct Usage",
                severity=severity,
                description="Contract contains selfdestruct. This allows contract self-destruction.",
                fix="1. Implement proper access control\n2. Consider if selfdestruct is necessary\n3. Use multisig for destruction",
                line_numbers=lines,
                code_snippet=self._get_code_snippet(lines),
                cwe_reference="CWE-284",
                impact="Contract can be destroyed, funds locked",
                likelihood="Low" if has_access_control else "Medium"
            ))
            self.security_score -= score_impact

    # ==================== HIGH VULNERABILITIES (🟠) ====================

    def check_access_control(self):
        """Check for access control issues - FIXED (no false positives on withdraw)"""
        # Critical functions that should have access control
        admin_functions = ['transferOwnership', 'mint', 'destroy', 'pause', 'unpause', 'kill', 'emergency']
        
        for func in admin_functions:
            pattern = rf'function\s+{func}\s*\('
            lines = self._find_lines(pattern)
            for line_num in lines:
                # Check if function has any modifier
                has_modifier = False
                line = self.lines[line_num-1]
                if re.search(r'onlyOwner|onlyAdmin|auth', line):
                    has_modifier = True
                
                if not has_modifier:
                    # Check for require statements inside function
                    func_body_start = line_num
                    func_body_end = self._find_function_end(func_body_start)
                    has_require = False
                    
                    for i in range(func_body_start, min(func_body_end, func_body_start + 20)):
                        if re.search(r'require\s*\(\s*msg\.sender\s*==', self.lines[i-1]):
                            has_require = True
                            break
                    
                    if not has_require:
                        self.vulnerabilities.append(Vulnerability(
                            issue=f"Missing Access Control on {func}()",
                            severity=RiskLevel.HIGH,
                            description=f"Admin function '{func}' lacks access control. Anyone can call it.",
                            fix="Add onlyOwner modifier or implement proper authorization checks",
                            line_numbers=[line_num],
                            code_snippet=self._get_code_snippet([line_num]),
                            cwe_reference="CWE-284",
                            impact="Unauthorized users can access critical functions",
                            likelihood="High"
                        ))
                        self.security_score -= 20

    def check_integer_overflow(self):
        """Check for integer overflow/underflow in older versions - FIXED"""
        if any(v in self.pragma_version for v in ['0.4', '0.5', '0.6', '0.7']):
            arithmetic_ops = self._find_lines(r'[^=]\+[^=]|[^=]-[^=]|\+=|-=|\*=|/=')
            # Filter out comments and strings
            valid_ops = []
            for line_num in arithmetic_ops:
                line = self.lines[line_num-1]
                if not re.search(r'//.*|\".*\"', line):
                    valid_ops.append(line_num)
            
            if valid_ops:
                # Check if SafeMath is imported or used
                has_safemath = bool(re.search(r'import.*SafeMath|using.*SafeMath', self.code))
                
                if not has_safemath:
                    self.vulnerabilities.append(Vulnerability(
                        issue="Integer Overflow/Underflow Risk",
                        severity=RiskLevel.HIGH,
                        description=f"Using Solidity {self.pragma_version} without SafeMath. Arithmetic operations may overflow/underflow.",
                        fix="1. Upgrade to Solidity >=0.8.0\n2. Use SafeMath library\n3. Use unchecked blocks only when safe",
                        line_numbers=valid_ops[:5],
                        code_snippet=self._get_code_snippet(valid_ops[:3]),
                        cwe_reference="CWE-190",
                        impact="Unexpected values, potential exploitation",
                        likelihood="Medium"
                    ))
                    self.security_score -= 15

    # ==================== MEDIUM VULNERABILITIES (🟡) ====================

    def check_tx_origin(self):
        """Check for tx.origin usage"""
        lines = self._find_lines(r'tx\.origin')
        if lines:
            self.vulnerabilities.append(Vulnerability(
                issue="TX.Origin Authentication",
                severity=RiskLevel.MEDIUM,
                description="Using tx.origin for authentication makes the contract vulnerable to phishing attacks.",
                fix="Use msg.sender instead of tx.origin for authentication",
                line_numbers=lines,
                code_snippet=self._get_code_snippet(lines),
                cwe_reference="CWE-477",
                impact="Users may be tricked into authorizing malicious contracts",
                likelihood="Medium"
            ))
            self.security_score -= 10

    def check_gas_limit_issues(self):
        """Check for gas limit related issues - FIXED"""
        patterns = [
            (r'\.send\s*\(', "send() (2300 gas limit)"),
            (r'\.transfer\s*\(', "transfer() (2300 gas limit)")
        ]
        
        for pattern, desc in patterns:
            lines = self._find_lines(pattern)
            if lines:
                self.vulnerabilities.append(Vulnerability(
                    issue="Gas Limit Vulnerability",
                    severity=RiskLevel.MEDIUM,
                    description=f"{desc} may fail if gas costs increase. Use call() instead.",
                    fix="Use call() with appropriate gas amount: (bool success, ) = to.call{value: amount}(\"\")",
                    line_numbers=lines,
                    code_snippet=self._get_code_snippet(lines),
                    cwe_reference="CWE-682",
                    impact="Functions may become unusable",
                    likelihood="Low"
                ))
                self.security_score -= 5

    def check_timestamp_dependency(self):
        """Check for block.timestamp/now usage - FIXED (less aggressive)"""
        lines = self._find_lines(r'block\.timestamp|now\b')
        if lines:
            # Check if it's used for critical logic (randomness, lottery, etc.)
            critical_timestamp_usage = []
            for line_num in lines:
                line = self.lines[line_num-1]
                if re.search(r'random|lottery|winner|seed', line, re.IGNORECASE):
                    critical_timestamp_usage.append(line_num)
            
            if critical_timestamp_usage:
                self.vulnerabilities.append(Vulnerability(
                    issue="Timestamp Dependency for Critical Logic",
                    severity=RiskLevel.MEDIUM,
                    description="Using block.timestamp for randomness/lottery is unsafe as miners can manipulate it.",
                    fix="Use Chainlink VRF or commit-reveal scheme for randomness",
                    line_numbers=critical_timestamp_usage,
                    code_snippet=self._get_code_snippet(critical_timestamp_usage),
                    cwe_reference="CWE-682",
                    impact="Miners can influence outcomes",
                    likelihood="Medium"
                ))
                self.security_score -= 8

    # ==================== LOW VULNERABILITIES (🔵) ====================

    def check_floating_pragma(self):
        """Check for floating pragma"""
        if re.search(r'pragma\s+solidity\s+\^', self.code):
            self.vulnerabilities.append(Vulnerability(
                issue="Floating Pragma",
                severity=RiskLevel.LOW,
                description=f"Floating pragma ^ used: {self.pragma_version}. Contracts should be deployed with exact compiler version.",
                fix="Use exact pragma version: pragma solidity X.Y.Z",
                line_numbers=self._find_lines(r'pragma\s+solidity\s+\^'),
                code_snippet=self._get_code_snippet(self._find_lines(r'pragma\s+solidity\s+\^')),
                cwe_reference="CWE-1103",
                impact="Unexpected behavior with different compiler versions",
                likelihood="Low"
            ))
            self.security_score -= 2

    def check_unused_variables(self):
        """Check for unused variables - COMPLETELY REWRITTEN to be accurate"""
        # This is a simplified version - a real implementation would need AST parsing
        # For now, we'll only flag obvious unused state variables
        
        # Find state variable declarations
        state_var_pattern = r'(public|private|internal)?\s*(uint|int|address|bool|string|mapping|bytes\d*)\s+(public|private|internal)?\s+(\w+)'
        declared_vars = {}
        used_vars = set()
        
        # Find all state variable declarations
        for i, line in enumerate(self.lines, 1):
            # Skip function bodies for declaration detection
            if re.search(r'function\s+\w+\s*\(', line):
                continue
                
            match = re.search(r'(uint|int|address|bool|string|mapping|bytes\d*)\s+(public|private|internal)?\s*(\w+)', line)
            if match and 'function' not in line and 'event' not in line:
                var_type = match.group(1)
                var_name = match.group(3)
                if var_name and len(var_name) > 1:  # Avoid single letters
                    declared_vars[var_name] = i
        
        # Find usage
        for i, line in enumerate(self.lines, 1):
            for var_name in declared_vars.keys():
                if var_name in line and not re.search(rf'{var_name}\s*=.*{var_name}', line):
                    used_vars.add(var_name)
        
        # Find unused variables
        unused = []
        unused_lines = []
        for var_name, line_num in declared_vars.items():
            if var_name not in used_vars:
                # Check if it's actually used in functions
                is_used = False
                for i, line in enumerate(self.lines, 1):
                    if var_name in line and i != line_num:
                        is_used = True
                        break
                if not is_used:
                    unused.append(var_name)
                    unused_lines.append(line_num)
        
        if unused:
            self.vulnerabilities.append(Vulnerability(
                issue="Unused State Variables",
                severity=RiskLevel.LOW,
                description=f"Found {len(unused)} unused state variable(s): {', '.join(unused[:3])}. This increases gas costs.",
                fix="Remove unused variables or document why they're needed",
                line_numbers=unused_lines[:5],
                code_snippet=self._get_code_snippet(unused_lines[:3]),
                impact="Higher gas costs, code clutter",
                likelihood="N/A"
            ))
            self.security_score -= len(unused)

    def _find_function_start(self, line_num: int) -> int:
        """Find where a function starts"""
        for i in range(max(1, line_num - 20), line_num):
            if re.search(r'function\s+\w+\s*\(', self.lines[i-1]):
                return i
        return max(1, line_num - 10)

    def _find_function_end(self, start_line: int) -> int:
        """Find where a function ends"""
        brace_count = 0
        in_function = False
        
        for i in range(start_line - 1, len(self.lines)):
            line = self.lines[i]
            if not in_function and '{' in line:
                in_function = True
                brace_count += line.count('{') - line.count('}')
            elif in_function:
                brace_count += line.count('{') - line.count('}')
                if brace_count <= 0:
                    return i + 1
        return len(self.lines)

    # ==================== INFO/GREEN ZONE (🟢) ====================

    def check_best_practices(self):
        """Check for best practices and optimizations"""
        recommendations = []
        
        # Check for events
        if not re.search(r'event\s+\w+', self.code):
            recommendations.append("Add events for important state changes")
        
        # Check for zero address checks
        if 'address' in self.code and not re.search(r'require.*address\(0\)', self.code):
            recommendations.append("Consider adding zero address validation for critical address parameters")
        
        # Check for magic numbers (but ignore small numbers)
        magic_numbers = re.findall(r'\b(10000|100000|86400|604800|31536000)\b', self.code)
        if magic_numbers:
            recommendations.append("Replace large magic numbers with named constants")
        
        # Check for NatSpec comments
        if '@param' not in self.code and '@return' not in self.code:
            recommendations.append("Add NatSpec comments (@param, @return) for better documentation")
        
        if recommendations:
            self.vulnerabilities.append(Vulnerability(
                issue="Best Practices Recommendations",
                severity=RiskLevel.INFO,
                description="Your contract could be improved with these best practices:",
                fix="\n".join(f"• {rec}" for rec in recommendations),
                line_numbers=[],
                code_snippet="",
                impact="Improved security and maintainability",
                likelihood="N/A"
            ))

    def analyze(self) -> Dict[str, Any]:
        """Run all vulnerability checks"""
        
        # Reset score
        self.security_score = 100
        self.vulnerabilities = []
        
        # Critical checks (🔴)
        self.check_reentrancy()
        self.check_unchecked_external_calls()
        self.check_selfdestruct()
        
        # High checks (🟠)
        self.check_access_control()
        self.check_integer_overflow()
        
        # Medium checks (🟡)
        self.check_tx_origin()
        self.check_gas_limit_issues()
        self.check_timestamp_dependency()
        
        # Low checks (🔵)
        self.check_floating_pragma()
        self.check_unused_variables()
        
        # Info/Green zone (🟢)
        self.check_best_practices()
        
        # Sort vulnerabilities by severity
        severity_order = {
            RiskLevel.CRITICAL: 0,
            RiskLevel.HIGH: 1,
            RiskLevel.MEDIUM: 2,
            RiskLevel.LOW: 3,
            RiskLevel.INFO: 4,
            RiskLevel.SAFE: 5
        }
        self.vulnerabilities.sort(key=lambda v: severity_order[v.severity])
        
        # Calculate deployment readiness - FIXED
        has_critical = any(v.severity == RiskLevel.CRITICAL for v in self.vulnerabilities)
        has_high = any(v.severity == RiskLevel.HIGH for v in self.vulnerabilities)
        
        if has_critical:
            can_deploy = False
            deployment_risk = "CRITICAL"
            message = "DO NOT DEPLOY! Critical vulnerabilities detected."
        elif has_high:
            can_deploy = False
            deployment_risk = "HIGH"
            message = "Fix high severity issues before deployment."
        else:
            can_deploy = True
            deployment_risk = "LOW"
            message = "Contract is safe to deploy."
        
        # Adjust security score based on findings
        self.security_score = max(0, min(100, self.security_score))
        
        # Generate report
        report = {
            "contract_name": self.contract_name,
            "pragma_version": self.pragma_version,
            "security_score": self.security_score,
            "deployment_readiness": {
                "can_deploy": can_deploy,
                "risk_level": deployment_risk,
                "reason": message,
                "recommendation": "Fix critical issues before deployment" if not can_deploy else "Ready for deployment"
            },
            "vulnerabilities": [],
            "summary": {
                "critical": len([v for v in self.vulnerabilities if v.severity == RiskLevel.CRITICAL]),
                "high": len([v for v in self.vulnerabilities if v.severity == RiskLevel.HIGH]),
                "medium": len([v for v in self.vulnerabilities if v.severity == RiskLevel.MEDIUM]),
                "low": len([v for v in self.vulnerabilities if v.severity == RiskLevel.LOW]),
                "info": len([v for v in self.vulnerabilities if v.severity == RiskLevel.INFO]),
                "total": len(self.vulnerabilities)
            }
        }
        
        # Format vulnerabilities for JSON response
        for v in self.vulnerabilities:
            report["vulnerabilities"].append({
                "issue": v.issue,
                "severity": v.severity.value,
                "description": v.description,
                "fix": v.fix,
                "line_numbers": v.line_numbers,
                "code_snippet": v.code_snippet,
                "cwe_reference": v.cwe_reference,
                "impact": v.impact,
                "likelihood": v.likelihood
            })
        
        return report

def analyze_smart_contract(code: str) -> Dict[str, Any]:
    """
    Main entry point for smart contract analysis
    """
    analyzer = SmartContractAnalyzer(code)
    return analyzer.analyze()