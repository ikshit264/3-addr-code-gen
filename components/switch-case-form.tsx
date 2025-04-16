"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Plus, Trash2, AlertCircle } from "lucide-react"

interface SwitchCaseFormProps {
  onGenerate: (expression: string, cases: Array<[string | number | null, string[]]>) => void
}

export default function SwitchCaseForm({ onGenerate }: SwitchCaseFormProps) {
  const [expression, setExpression] = useState<string>("x")
  const [cases, setCases] = useState<
    Array<{ value: string; statement: string; equations: string[]; isDefault: boolean }>
  >([
    { value: "1", statement: "", equations: ["a = b + c", "d = a * 2"], isDefault: false },
    { value: "2", statement: "", equations: ["x = y - z", "result = x / 10"], isDefault: false },
    { value: "", statement: "", equations: ["default_val = p * q"], isDefault: true },
  ])
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})

  const validateEquation = (equation: string): boolean => {
    if (!equation.trim()) return true // Empty equations are valid (they'll be skipped)

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
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(left)) {
      return false
    }

    // Right side should not be empty
    if (!right) {
      return false
    }

    return true
  }

  const handleAddCase = () => {
    setCases([...cases, { value: "", statement: "", equations: [], isDefault: false }])
  }

  const handleRemoveCase = (index: number) => {
    setCases(cases.filter((_, i) => i !== index))

    // Clear validation errors for this case
    const newErrors = { ...validationErrors }
    delete newErrors[`case-${index}`]
    setValidationErrors(newErrors)
  }

  const handleCaseChange = (
    index: number,
    field: "value" | "statement" | "isDefault" | "equations",
    value: string | boolean | string[],
  ) => {
    const newCases = [...cases]

    if (field === "isDefault" && value === true) {
      // If setting a case to default, ensure no other case is default
      newCases.forEach((c, i) => {
        if (i !== index) {
          c.isDefault = false
        }
      })
    }

    newCases[index] = {
      ...newCases[index],
      [field]: value,
      ...(field === "isDefault" && value === true ? { value: "" } : {}),
    }

    setCases(newCases)
  }

  const handleAddEquation = (caseIndex: number) => {
    const newCases = [...cases]
    newCases[caseIndex].equations.push("")
    setCases(newCases)
  }

  const handleRemoveEquation = (caseIndex: number, eqIndex: number) => {
    const newCases = [...cases]
    newCases[caseIndex].equations = newCases[caseIndex].equations.filter((_, i) => i !== eqIndex)
    setCases(newCases)

    // Clear validation errors for this equation
    const newErrors = { ...validationErrors }
    if (newErrors[`case-${caseIndex}`]) {
      newErrors[`case-${caseIndex}`] = newErrors[`case-${caseIndex}`].filter((_, i) => i !== eqIndex)
      if (newErrors[`case-${caseIndex}`].length === 0) {
        delete newErrors[`case-${caseIndex}`]
      }
    }
    setValidationErrors(newErrors)
  }

  const handleEquationChange = (caseIndex: number, eqIndex: number, value: string) => {
    const newCases = [...cases]
    newCases[caseIndex].equations[eqIndex] = value
    setCases(newCases)

    // Validate the equation
    const isValid = validateEquation(value)
    const newErrors = { ...validationErrors }

    if (!isValid && value.trim() !== "") {
      // Add error
      if (!newErrors[`case-${caseIndex}`]) {
        newErrors[`case-${caseIndex}`] = []
      }

      // Make sure we have enough slots in the array
      while (newErrors[`case-${caseIndex}`].length <= eqIndex) {
        newErrors[`case-${caseIndex}`].push("")
      }

      newErrors[`case-${caseIndex}`][eqIndex] = "Invalid equation format"
    } else {
      // Remove error if it exists
      if (newErrors[`case-${caseIndex}`] && newErrors[`case-${caseIndex}`][eqIndex]) {
        newErrors[`case-${caseIndex}`][eqIndex] = ""

        // Clean up empty errors
        if (newErrors[`case-${caseIndex}`].every((err) => err === "")) {
          delete newErrors[`case-${caseIndex}`]
        }
      }
    }

    setValidationErrors(newErrors)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Final validation
    let hasErrors = false
    const newErrors: Record<string, string[]> = {}

    cases.forEach((caseItem, caseIndex) => {
      caseItem.equations.forEach((equation, eqIndex) => {
        if (equation.trim() !== "" && !validateEquation(equation)) {
          if (!newErrors[`case-${caseIndex}`]) {
            newErrors[`case-${caseIndex}`] = []
          }

          // Make sure we have enough slots in the array
          while (newErrors[`case-${caseIndex}`].length <= eqIndex) {
            newErrors[`case-${caseIndex}`].push("")
          }

          newErrors[`case-${caseIndex}`][eqIndex] = "Invalid equation format"
          hasErrors = true
        }
      })
    })

    setValidationErrors(newErrors)

    if (hasErrors) {
      return // Don't submit if there are validation errors
    }

    const formattedCases = cases.map((c) => {
      const value = c.isDefault ? null : isNaN(Number(c.value)) ? c.value : Number(c.value)
      const statements = []

      // Only add the statement if it's not empty
      if (c.statement.trim() !== "") {
        statements.push(c.statement)
      }

      // Add non-empty equations to statements
      if (c.equations.length > 0) {
        statements.push(...c.equations.filter((eq) => eq.trim() !== ""))
      }

      return [value, statements] as [string | number | null, string[]]
    })

    onGenerate(expression, formattedCases)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-2xl font-semibold mb-4">Switch Case Input</h2>

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label htmlFor="expression" className="block text-sm font-medium mb-2">
            Switch Expression
          </label>
          <input
            id="expression"
            type="text"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="e.g., x, value, choice"
            required
          />
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">Case Statements</label>
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddCase}
              className="text-sm flex items-center gap-1 px-3 py-1 bg-black text-white rounded-md"
            >
              <Plus size={14} /> Add Case
            </motion.button>
          </div>

          <div className="space-y-4">
            {cases.map((caseItem, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-2 p-4 border border-gray-200 rounded-md"
              >
                <div className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`default-${index}`}
                      checked={caseItem.isDefault}
                      onChange={(e) => handleCaseChange(index, "isDefault", e.target.checked)}
                      className="rounded border-gray-300 text-black focus:ring-black"
                    />
                    <label htmlFor={`default-${index}`} className="text-sm">
                      Default Case
                    </label>
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleRemoveCase(index)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </motion.button>
                </div>

                {!caseItem.isDefault && (
                  <div>
                    <label className="block text-xs mb-1">Case Value</label>
                    <input
                      type="text"
                      value={caseItem.value}
                      onChange={(e) => handleCaseChange(index, "value", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="e.g., 1, 'value'"
                      disabled={caseItem.isDefault}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs mb-1">Statement (Optional)</label>
                  <input
                    type="text"
                    value={caseItem.statement}
                    onChange={(e) => handleCaseChange(index, "statement", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="e.g., result = value * 2;"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mt-3 mb-1">
                    <label className="block text-xs">Equations</label>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAddEquation(index)}
                      className="text-xs flex items-center gap-1 px-2 py-1 bg-black text-white rounded-md"
                    >
                      <Plus size={12} /> Add Equation
                    </motion.button>
                  </div>

                  {caseItem.equations.length > 0 ? (
                    <div className="space-y-2">
                      {caseItem.equations.map((equation, eqIndex) => (
                        <div key={eqIndex} className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={equation}
                              onChange={(e) => handleEquationChange(index, eqIndex, e.target.value)}
                              className={`flex-1 px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-black ${
                                validationErrors[`case-${index}`]?.[eqIndex] ? "border-red-500" : "border-gray-300"
                              }`}
                              placeholder="e.g., x = y + z"
                            />
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleRemoveEquation(index, eqIndex)}
                              className="text-gray-500 hover:text-red-500"
                            >
                              <Trash2 size={14} />
                            </motion.button>
                          </div>
                          {validationErrors[`case-${index}`]?.[eqIndex] && (
                            <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                              <AlertCircle size={12} />
                              <span>{validationErrors[`case-${index}`][eqIndex]}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No equations added</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
        >
          Generate 3-Address Code
        </motion.button>
      </form>
    </div>
  )
}
