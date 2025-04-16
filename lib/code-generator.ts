/**
 * Symbol Table class for managing variables and temporary values
 */
class SymbolTable {
  table: Record<string, { type: string; place: string }>
  tempCounter: number
  labelCounter: number

  constructor() {
    this.table = {}
    this.tempCounter = 0
    this.labelCounter = 0
  }

  addSymbol(name: string, symbolType: string) {
    this.table[name] = { type: symbolType, place: name }
  }

  getSymbol(name: string) {
    return this.table[name] || null
  }

  newTemp() {
    const temp = `t${this.tempCounter}`
    this.tempCounter += 1
    return temp
  }

  newLabel() {
    const label = `L${this.labelCounter}`
    this.labelCounter += 1
    return label
  }
}

/**
 * Code Generator class for generating and managing 3-address code
 */
class CodeGenerator {
  code: string[]
  nextquad: number
  symbolTable: SymbolTable
  logs: string[]

  constructor() {
    this.code = []
    this.nextquad = 0
    this.symbolTable = new SymbolTable()
    this.logs = []
  }

  log(message: string) {
    this.logs.push(message)
  }

  gen(code: string) {
    this.code.push(`${this.nextquad}: ${code}`)
    const quad = this.nextquad
    this.nextquad += 1
    return quad
  }

  backpatch(listOfQuads: number[], targetLabel: number) {
    for (const quad of listOfQuads) {
      if (quad < this.code.length) {
        // Replace the placeholder with the actual label
        this.code[quad] = this.code[quad].replace("goto __", `goto ${targetLabel}`)
      }
    }
  }

  merge(list1: number[] | null | undefined, list2: number[] | null | undefined) {
    if (!list1) return list2 || []
    if (!list2) return list1
    return [...list1, ...list2]
  }

  makeList(quad: number) {
    return [quad]
  }
}

/**
 * Switch Case Translator class for translating switch-case statements to 3-address code
 */
class SwitchCaseTranslator {
  codeGen: CodeGenerator
  caseQueue: Array<[string | number, number]> // Queue to store case values and labels (V.place, V.next)
  defaultLabel: number | null // Default case label (caselist.d)

  constructor(codeGen: CodeGenerator) {
    this.codeGen = codeGen
    this.caseQueue = []
    this.defaultLabel = null
  }

  translateSwitch(expression: string, caseStatements: Array<[string | number | null, string[]]>) {
    this.codeGen.log("\n=== Translating Switch Statement ===")
    this.codeGen.log(`Switch expression: ${expression}`)

    // Get place for the expression
    const exprPlace = expression
    if (!this.codeGen.symbolTable.table[expression]) {
      this.codeGen.symbolTable.addSymbol(expression, "unknown")
    }

    this.codeGen.log(`Expression place: ${exprPlace}`)

    // N → ε, N.next = makelist(nextquad), gen(goto __)
    const nNextQuad = this.codeGen.gen("goto __")
    const nNext = this.codeGen.makeList(nNextQuad)
    this.codeGen.log(`Generated N.next quad at ${nNextQuad}: goto __`)

    // Process caselist
    let caselistNext = null

    // Parse case statements to build the case list structure
    for (let i = 0; i < caseStatements.length; i++) {
      const [caseValue, statement] = caseStatements[i]

      if (i === 0) {
        // First case statement: caselist → case V : S
        if (caseValue === null) {
          caselistNext = this.translateDefault(statement)
        } else {
          caselistNext = this.translateCase(caseValue, statement)
        }
      } else {
        // Additional case statements: caselist → caselist case V : S
        if (caseValue === null) {
          caselistNext = this.translateDefault(statement, caselistNext)
        } else {
          caselistNext = this.translateCase(caseValue, statement, caselistNext)
        }
      }
    }

    // Backpatch N.next to the beginning of the comparison section
    this.codeGen.backpatch(nNext, this.codeGen.nextquad)
    this.codeGen.log(`Backpatched N.next (${nNextQuad}) with ${this.codeGen.nextquad}`)

    // Generate comparison code for each case entry in Q
    this.codeGen.log("\n=== Generating Comparison Code ===")
    for (const [vPlace, vLabel] of this.caseQueue) {
      const comparisonQuad = this.codeGen.gen(`if ${exprPlace} == ${vPlace} goto ${vLabel}`)
      this.codeGen.log(`Generated comparison at quad ${comparisonQuad}: if ${exprPlace} == ${vPlace} goto ${vLabel}`)
    }

    // If default case exists, generate goto default
    if (this.defaultLabel !== null) {
      const defaultGotoQuad = this.codeGen.gen(`goto ${this.defaultLabel}`)
      this.codeGen.log(`Generated goto default at quad ${defaultGotoQuad}: goto ${this.defaultLabel}`)
    }

    // S.Next = caselist.next
    const switchNext = caselistNext

    // Backpatch all S.next (end of switch)
    if (switchNext) {
      this.codeGen.backpatch(switchNext, this.codeGen.nextquad)
      this.codeGen.log(`Backpatched switch_next with ${this.codeGen.nextquad}`)
    }

    // End label for the switch statement
    const endLabel = this.codeGen.nextquad
    this.codeGen.gen("# End of switch statement")
    this.codeGen.log(`Generated end label at ${endLabel}`)

    return switchNext
  }

  translateCase(caseValue: string | number, statement: string[], prevCaselistNext: number[] | null = null) {
    this.codeGen.log(`\n=== Translating Case: ${caseValue} ===`)

    // V → id (or value)
    const vPlace = caseValue
    const vNext = this.codeGen.nextquad
    this.codeGen.log(`V.place = ${vPlace}, V.next = ${vNext}`)

    // Generate label for case statements
    const caseLabel = this.codeGen.nextquad

    // Generate code for the case statement
    this.codeGen.log(`Generating code for case ${caseValue} at quad ${caseLabel}`)

    // Process the main statement first (only if not empty)
    if (statement.length > 0 && statement[0].trim() !== "") {
      this.codeGen.gen(`${statement[0]}`)
    }

    // Process any equations (starting from index 1)
    if (statement.length > 1) {
      this.codeGen.log(`\n=== Processing Equations for Case: ${caseValue} ===`)
      for (let i = 1; i < statement.length; i++) {
        const equation = statement[i].trim()
        if (equation === "") continue // Skip empty equations

        if (isValidEquation(equation)) {
          this.codeGen.log(`Processing equation: ${equation}`)
          generateEquationCode(this.codeGen, equation)
        } else {
          this.codeGen.log(`Invalid equation format: ${equation} - skipping`)
        }
      }
    }

    // S.next is empty for our simple statements
    const sNext: number[] = []

    // Generate goto __ at the end of the case statement
    const gotoQuad = this.codeGen.gen("goto __")
    const gotoNext = this.codeGen.makeList(gotoQuad)
    this.codeGen.log(`Generated goto at the end of case at quad ${gotoQuad}: goto __`)

    // caselist.next = merge(S.next, makelist(nextquad)) or
    // caselist.next = merge(caselist1.next, S.next, makelist(nextquad))
    let caselistNext
    if (prevCaselistNext) {
      caselistNext = this.codeGen.merge(prevCaselistNext, this.codeGen.merge(sNext, gotoNext))
    } else {
      caselistNext = this.codeGen.merge(sNext, gotoNext)
    }

    // enter(caselist.Q, V.place, V.next)
    this.caseQueue.push([vPlace, caseLabel])
    this.codeGen.log(`Added to case queue: (${vPlace}, ${caseLabel})`)

    return caselistNext
  }

  translateDefault(statement: string[], prevCaselistNext: number[] | null = null) {
    this.codeGen.log("\n=== Translating Default Case ===")

    // M → ε, M.quad = nextquad
    const mQuad = this.codeGen.nextquad
    this.codeGen.log(`M.quad = ${mQuad}`)

    // Set default label (caselist.d = M.quad)
    this.defaultLabel = mQuad
    this.codeGen.log(`Default label: ${this.defaultLabel}`)

    // Generate code for the default statement
    this.codeGen.log(`Generating code for default case at quad ${mQuad}`)

    // Process the main statement first (only if not empty)
    if (statement.length > 0 && statement[0].trim() !== "") {
      this.codeGen.gen(`${statement[0]}`)
    }

    // Process any equations (starting from index 1)
    if (statement.length > 1) {
      this.codeGen.log(`\n=== Processing Equations for Default Case ===`)
      for (let i = 1; i < statement.length; i++) {
        const equation = statement[i].trim()
        if (equation === "") continue // Skip empty equations

        if (isValidEquation(equation)) {
          this.codeGen.log(`Processing equation: ${equation}`)
          generateEquationCode(this.codeGen, equation)
        } else {
          this.codeGen.log(`Invalid equation format: ${equation} - skipping`)
        }
      }
    }

    // S.next is empty for our simple statements
    const sNext: number[] = []

    // Generate goto __ at the end of default statement
    const gotoQuad = this.codeGen.gen("goto __")
    const gotoNext = this.codeGen.makeList(gotoQuad)
    this.codeGen.log(`Generated goto at the end of default at quad ${gotoQuad}: goto __`)

    // caselist.next = merge(S.next, makelist(nextquad)) or
    // caselist.next = merge(caselist1.next, S.next, makelist(nextquad))
    let caselistNext
    if (prevCaselistNext) {
      caselistNext = this.codeGen.merge(prevCaselistNext, this.codeGen.merge(sNext, gotoNext))
    } else {
      caselistNext = this.codeGen.merge(sNext, gotoNext)
    }

    return caselistNext
  }
}

// Function to validate if a string is a valid equation
function isValidEquation(equation: string): boolean {
  // Remove any trailing semicolon
  if (equation.endsWith(";")) {
    equation = equation.slice(0, -1).trim()
  }

  // Basic validation: must contain an equals sign
  if (!equation.includes("=")) {
    return false
  }

  // Split into left and right sides
  const parts = equation.split("=").map((part) => part.trim())

  // Must have exactly one equals sign (resulting in 2 parts)
  if (parts.length !== 2) {
    return false
  }

  const [left, right] = parts

  // Left side should be a valid identifier (variable name)
  if (!isValidIdentifier(left)) {
    return false
  }

  // Right side should not be empty
  if (!right) {
    return false
  }

  // Check for balanced parentheses in the right side
  if (!hasBalancedParentheses(right)) {
    return false
  }

  return true
}

// Helper function to check if a string is a valid identifier
function isValidIdentifier(str: string): boolean {
  // Simple check: starts with letter or underscore, followed by letters, numbers, or underscores
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(str)
}

// Helper function to check for balanced parentheses
function hasBalancedParentheses(str: string): boolean {
  let count = 0

  for (const char of str) {
    if (char === "(") {
      count++
    } else if (char === ")") {
      count--
      if (count < 0) return false // More closing than opening
    }
  }

  return count === 0 // Should be balanced at the end
}

// Add a new function to parse and generate 3-address code for equations
function generateEquationCode(codeGen: CodeGenerator, equation: string) {
  // Trim whitespace
  equation = equation.trim()

  // Skip empty equations or non-assignment statements
  if (!equation || !equation.includes("=")) {
    return
  }

  // Remove any trailing semicolon
  if (equation.endsWith(";")) {
    equation = equation.slice(0, -1)
  }

  // Split into left and right sides of assignment
  const [left, right] = equation.split("=").map((part) => part.trim())

  // Simple case: direct assignment (e.g., x = y)
  if (!containsOperators(right)) {
    codeGen.gen(`${left} = ${right}`)
    return
  }

  // Handle expressions with operators
  const tokens = tokenizeExpression(right)
  const result = parseExpression(tokens, codeGen)
  codeGen.gen(`${left} = ${result}`)
}

// Helper function to check if a string contains arithmetic operators
function containsOperators(str: string): boolean {
  return /[+\-*/%]/.test(str)
}

// Tokenize an expression into operands and operators
function tokenizeExpression(expr: string): string[] {
  // Replace operators with spaces around them for easier splitting
  const spaced = expr.replace(/([+\-*/%()])/g, " $1 ")
  // Split by whitespace and filter out empty strings
  return spaced.split(/\s+/).filter((token) => token.length > 0)
}

// Parse an expression and generate 3-address code
function parseExpression(tokens: string[], codeGen: CodeGenerator): string {
  // Handle simple expressions
  if (tokens.length === 1) {
    return tokens[0]
  }

  // Find multiplication and division first (higher precedence)
  for (let i = 1; i < tokens.length - 1; i++) {
    if (tokens[i] === "*" || tokens[i] === "/" || tokens[i] === "%") {
      const temp = codeGen.symbolTable.newTemp()
      codeGen.gen(`${temp} = ${tokens[i - 1]} ${tokens[i]} ${tokens[i + 1]}`)

      // Replace the three tokens with the temp variable
      tokens.splice(i - 1, 3, temp)
      i--
    }
  }

  // Then handle addition and subtraction
  for (let i = 1; i < tokens.length - 1; i++) {
    if (tokens[i] === "+" || tokens[i] === "-") {
      const temp = codeGen.symbolTable.newTemp()
      codeGen.gen(`${temp} = ${tokens[i - 1]} ${tokens[i]} ${tokens[i + 1]}`)

      // Replace the three tokens with the temp variable
      tokens.splice(i - 1, 3, temp)
      i--
    }
  }

  return tokens[0]
}

/**
 * Main function to translate a switch case statement to 3-address code
 */
export function translateSwitchCase(expression: string, cases: Array<[string | number | null, string[]]>) {
  const codeGen = new CodeGenerator()
  const translator = new SwitchCaseTranslator(codeGen)

  translator.translateSwitch(expression, cases)

  return {
    code: codeGen.code,
    logs: codeGen.logs,
  }
}
