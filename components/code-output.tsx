"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Copy, Check } from "lucide-react"

interface CodeOutputProps {
  code: string[]
  logs: string[]
}

export default function CodeOutput({ code, logs }: CodeOutputProps) {
  const [activeTab, setActiveTab] = useState<"code" | "logs">("code")
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (activeTab === "code") {
      await navigator.clipboard.writeText(code.join("\n"))
    } else {
      await navigator.clipboard.writeText(logs.join("\n"))
    }

    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("code")}
          className={`flex-1 py-3 text-center text-sm font-medium ${
            activeTab === "code" ? "border-b-2 border-black" : "text-gray-500"
          }`}
        >
          Generated Code
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex-1 py-3 text-center text-sm font-medium ${
            activeTab === "logs" ? "border-b-2 border-black" : "text-gray-500"
          }`}
        >
          Execution Logs
        </button>
      </div>

      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1 rounded-md hover:bg-gray-100"
          title="Copy to clipboard"
        >
          {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
        </motion.button>

        <pre className="p-4 overflow-auto bg-gray-50 rounded-b-lg max-h-[500px] text-sm">
          <code>
            {activeTab === "code"
              ? code.length > 0
                ? code.join("\n")
                : "No code generated yet. Fill the form and click 'Generate'."
              : logs.length > 0
                ? logs.join("\n")
                : "No logs available yet."}
          </code>
        </pre>
      </div>
    </div>
  )
}

