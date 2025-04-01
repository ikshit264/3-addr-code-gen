"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import SwitchCaseForm from "@/components/switch-case-form"
import CodeOutput from "@/components/code-output"
import { translateSwitchCase } from "@/lib/code-generator"

export default function Home() {
  const [generatedCode, setGeneratedCode] = useState<string[]>([])
  const [logs, setLogs] = useState<string[]>([])

  const handleGenerate = (expression: string, cases: Array<[string | number | null, string[]]>) => {
    const { code, logs: generationLogs } = translateSwitchCase(expression, cases)
    setGeneratedCode(code)
    setLogs(generationLogs)
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8"
      >
        <h1 className="text-4xl font-bold mb-2 text-center">3-Address Code Generator</h1>
        <p className="text-center mb-8 text-gray-700">Convert switch-case statements to 3-address code</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <SwitchCaseForm onGenerate={handleGenerate} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <CodeOutput code={generatedCode} logs={logs} />
          </motion.div>
        </div>
      </motion.div>
    </main>
  )
}

