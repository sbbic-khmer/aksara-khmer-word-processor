"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KhmerBreaker } from "@/lib/khmer-breaker"
import { KHMER_DICTIONARY } from "@/lib/khmer-dictionary-data"
import { Copy, Plus } from "lucide-react"

const SAMPLE_TEXTS = [
  "សួស្តីបងប្អូនទាំងអស់គ្នា",
  "ខ្ញុំស្រលាញ់ប្រទេសកម្ពុជា",
  "ភាសាខ្មែរជាភាសាមួយដ៏សម្បូរបែប។ វាមានប្រវត្តិយូរអង្វែងជាងពីរពាន់ឆ្នាំ។",
  "ការអភិវឌ្ឍន៍បច្ចេកវិទ្យាកំពុងរីកចម្រើនយ៉ាងឆាប់រហ័សនៅក្នុងប្រទេសកម្ពុជា។",
  "ព្រះរាជាណាចក្រកម្ពុជាមានទីតាំងស្ថិតនៅអាស៊ីអាគ្នេយ៍។ រាជធានីគឺភ្នំពេញ។",
]

const ZWSP = "\u200B"

export default function KhmerDemo() {
  const [inputText, setInputText] = useState("សួស្តីបងប្អូនទាំងអស់គ្នា")
  const [segments, setSegments] = useState<string[]>([])
  const [withBreaks, setWithBreaks] = useState("")
  const [breaker] = useState(() => new KhmerBreaker(KHMER_DICTIONARY))
  const [hasUserBreaks, setHasUserBreaks] = useState(false)
  const [copied, setCopied] = useState(false)

  const processText = useCallback(() => {
    if (!inputText.trim()) {
      setSegments([])
      setWithBreaks("")
      return
    }
    const segmentResult = breaker.getSegments(inputText)
    const breakResult = breaker.insertBreakOpportunities(inputText)
    setSegments(segmentResult)
    setWithBreaks(breakResult)
    setHasUserBreaks(inputText.includes(ZWSP))
  }, [breaker, inputText])

  useEffect(() => {
    processText()
  }, [processText])

  const handleSampleClick = (sample: string) => {
    setInputText(sample)
  }

  const handleCopyWithBreaks = async () => {
    try {
      await navigator.clipboard.writeText(withBreaks)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleInsertZWSP = () => {
    const textarea = document.querySelector("textarea")
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newText = inputText.substring(0, start) + ZWSP + inputText.substring(end)
      setInputText(newText)
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1
        textarea.focus()
      }, 0)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Description */}
      <div className="text-center mb-4 sm:mb-6">
        <p className="text-sm sm:text-base text-muted-foreground">
          Analyze Khmer text segmentation using dictionary-based word breaking
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Input Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Input Text</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Enter Khmer text or select a sample below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="បញ្ចូលអត្ថបទខ្មែរនៅទីនេះ..."
              className="min-h-[100px] sm:min-h-[120px] text-base sm:text-lg"
              dir="ltr"
              style={{ fontFamily: "'Noto Sans Khmer', 'Khmer OS', sans-serif" }}
            />
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleInsertZWSP}
                title="Insert zero-width space at cursor"
                className="gap-1.5 text-xs sm:text-sm h-8 sm:h-9 bg-transparent"
              >
                <Plus className="h-3.5 w-3.5" />
                Insert ZWSP
              </Button>
              {hasUserBreaks && (
                <Badge variant="secondary" className="text-xs">
                  Contains manual breaks
                </Badge>
              )}
            </div>

            {/* Sample buttons */}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">Try a sample:</p>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_TEXTS.map((sample, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSampleClick(sample)}
                    className="text-xs h-7 sm:h-8"
                  >
                    Sample {index + 1}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Results</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Word segmentation and line break analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="segments" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-9 sm:h-10">
                <TabsTrigger value="segments" className="text-xs sm:text-sm">
                  Segments
                </TabsTrigger>
                <TabsTrigger value="visual" className="text-xs sm:text-sm">
                  Visual
                </TabsTrigger>
                <TabsTrigger value="wrapped" className="text-xs sm:text-sm">
                  Wrapping
                </TabsTrigger>
              </TabsList>

              <TabsContent value="segments" className="mt-3 sm:mt-4">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {segments.map((segment, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-sm sm:text-base px-2 sm:px-3 py-0.5 sm:py-1"
                        style={{ fontFamily: "'Noto Sans Khmer', 'Khmer OS', sans-serif" }}
                      >
                        {segment}
                      </Badge>
                    ))}
                  </div>
                  {segments.length > 0 && (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Found {segments.length} word{segments.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="visual" className="mt-3 sm:mt-4">
                <div
                  className="p-3 sm:p-4 bg-muted rounded-lg"
                  style={{ fontFamily: "'Noto Sans Khmer', 'Khmer OS', sans-serif" }}
                >
                  <p className="text-base sm:text-lg leading-relaxed">
                    {segments.map((segment, index) => (
                      <span key={index}>
                        <span className="border-b-2 border-primary/50">{segment}</span>
                        {index < segments.length - 1 && <span className="text-primary mx-0.5">|</span>}
                      </span>
                    ))}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="wrapped" className="mt-3 sm:mt-4">
                <div className="space-y-3 sm:space-y-4">
                  <div
                    className="p-3 sm:p-4 bg-muted rounded-lg text-base sm:text-lg leading-relaxed resize-x overflow-auto border-2 border-dashed border-border"
                    style={{
                      fontFamily: "'Noto Sans Khmer', 'Khmer OS', sans-serif",
                      wordBreak: "break-all",
                      overflowWrap: "break-word",
                      maxWidth: "300px",
                      minHeight: "80px",
                    }}
                  >
                    {withBreaks}
                  </div>
                  <p className="text-xs text-muted-foreground">Drag the corner to resize and see wrapping in action</p>
                  <div className="flex gap-2 items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyWithBreaks}
                      className="gap-1.5 text-xs sm:text-sm h-8 sm:h-9 bg-transparent"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copied ? "Copied!" : "Copy with breaks"}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* About Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">About</CardTitle>
          </CardHeader>
          <CardContent className="text-xs sm:text-sm text-muted-foreground space-y-3">
            <p>
              This tool uses a Trie-based dictionary lookup algorithm inspired by ICU{"'"}s Khmer Break Engine. It
              segments continuous Khmer text into individual words by matching against a dictionary of common Khmer
              words with frequency data.
            </p>
            <div>
              <p className="font-medium text-foreground mb-1.5">Key features:</p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>Dictionary-based word segmentation using Trie data structure</li>
                <li>Frequency-weighted matching for ambiguous segments</li>
                <li>Proper handling of Khmer character clusters</li>
                <li>Zero-width space insertion for CSS line breaking</li>
                <li>Manual break support with ZWSP characters</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
