"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Plus, Trash2 } from "lucide-react"

interface SwitchCaseFormProps {
  onGenerate: (expression: string, cases: Array<[string | number | null, string[]]>) => void
}

export default function SwitchCaseForm({ onGenerate }: SwitchCaseFormProps) {
  const [expression, setExpression] = useState<string>("day")
  const [cases, setCases] = useState<Array<{ value: string; statement: string; isDefault: boolean }>>([
    { value: "1", statement: 'printf("Monday");', isDefault: false },
    { value: "2", statement: 'printf("Tuesday");', isDefault: false },
    { value: "", statement: 'printf("Other day");', isDefault: true },
  ])

  const handleAddCase = () => {
    setCases([...cases, { value: "", statement: "", isDefault: false }])
  }

  const handleRemoveCase = (index: number) => {
    setCases(cases.filter((_, i) => i !== index))
  }

  const handleCaseChange = (index: number, field: "value" | "statement" | "isDefault", value: string | boolean) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const formattedCases = cases.map((c) => {
      const value = c.isDefault ? null : isNaN(Number(c.value)) ? c.value : Number(c.value)
      return [value, [c.statement]] as [string | number | null, string[]]
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
            placeholder="e.g., day, month, x"
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
                      placeholder="e.g., 1, 'Monday'"
                      disabled={caseItem.isDefault}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs mb-1">Statement</label>
                  <input
                    type="text"
                    value={caseItem.statement}
                    onChange={(e) => handleCaseChange(index, "statement", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="e.g., printf('Monday');"
                  />
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

