import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, ArrowLeft } from "lucide-react"

export default function AuthCodeError() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <Card className="glass-strong border-red-500/50 shadow-2xl shadow-red-500/20 max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-red-500/20 border border-red-500/50">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-red-400">
            Neural Link Error
          </CardTitle>
          <CardDescription className="text-gray-300">
            There was an issue establishing your connection
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-gray-400">
            The authentication process encountered an error. This could be due to an expired or invalid link.
          </p>
          
          <div className="space-y-2">
            <Link href="/signin">
              <Button className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-bold">
                Try Signing In Again
              </Button>
            </Link>
            
            <Link href="/signup">
              <Button variant="ghost" className="w-full text-cyan-400 hover:text-cyan-300">
                Create New Neural Link
              </Button>
            </Link>
            
            <Link href="/">
              <Button variant="ghost" className="w-full text-gray-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Interface
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}