'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, Copy, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageGenerationResponse {
  success: boolean;
  image?: string;
  service_used?: string;
  prompt?: string;
  seed?: number;
  error?: string;
  available_services?: {
    stable_diffusion: boolean;
    openai: boolean;
  };
}

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [steps, setSteps] = useState(20);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [useStableDiffusion, setUseStableDiffusion] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [serviceUsed, setServiceUsed] = useState<string>('');
  const [availableServices, setAvailableServices] = useState<{stable_diffusion: boolean; openai: boolean} | null>(null);
  
  const { toast } = useToast();

  const generateRandomSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000));
  };

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const response = await fetch('/api/image-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negative_prompt: negativePrompt.trim(),
          width,
          height,
          steps,
          guidance_scale: guidanceScale,
          seed,
          use_stable_diffusion: useStableDiffusion,
        }),
      });

      const result: ImageGenerationResponse = await response.json();

      if (result.success && result.image) {
        setGeneratedImage(result.image);
        setServiceUsed(result.service_used || 'Unknown');
        setAvailableServices(result.available_services || null);
        
        toast({
          title: "Success!",
          description: `Image generated using ${result.service_used}`,
        });
      } else {
        throw new Error(result.error || 'Failed to generate image');
      }
    } catch (error) {
      console.error('Image generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `jarvis-generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    toast({
      title: "Copied!",
      description: "Prompt copied to clipboard",
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🎨</span>
            Jarvis Image Generator
          </CardTitle>
          <CardDescription>
            Generate images using Stable Diffusion (local) or DALL-E (OpenAI)
            {availableServices && (
              <div className="mt-2 text-sm">
                Available: {availableServices.stable_diffusion ? '✅ Stable Diffusion' : '❌ Stable Diffusion'} | 
                {availableServices.openai ? ' ✅ OpenAI' : ' ❌ OpenAI'}
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Controls */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="prompt">Prompt *</Label>
                <Textarea
                  id="prompt"
                  placeholder="A beautiful landscape with mountains and a lake..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyPrompt}
                  className="mt-2"
                  disabled={!prompt}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Prompt
                </Button>
              </div>

              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="use-sd"
                      checked={useStableDiffusion}
                      onCheckedChange={setUseStableDiffusion}
                    />
                    <Label htmlFor="use-sd">Prefer Stable Diffusion (Local)</Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="width">Width: {width}px</Label>
                      <Slider
                        id="width"
                        min={256}
                        max={1024}
                        step={64}
                        value={[width]}
                        onValueChange={(value) => setWidth(value[0])}
                      />
                    </div>
                    <div>
                      <Label htmlFor="height">Height: {height}px</Label>
                      <Slider
                        id="height"
                        min={256}
                        max={1024}
                        step={64}
                        value={[height]}
                        onValueChange={(value) => setHeight(value[0])}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  <div>
                    <Label htmlFor="negative-prompt">Negative Prompt (Stable Diffusion only)</Label>
                    <Textarea
                      id="negative-prompt"
                      placeholder="blurry, low quality, distorted..."
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="steps">Steps: {steps}</Label>
                    <Slider
                      id="steps"
                      min={10}
                      max={50}
                      step={1}
                      value={[steps]}
                      onValueChange={(value) => setSteps(value[0])}
                    />
                  </div>

                  <div>
                    <Label htmlFor="guidance">Guidance Scale: {guidanceScale}</Label>
                    <Slider
                      id="guidance"
                      min={1}
                      max={20}
                      step={0.5}
                      value={[guidanceScale]}
                      onValueChange={(value) => setGuidanceScale(value[0])}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      placeholder="Random seed"
                      value={seed || ''}
                      onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateRandomSeed}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              <Button
                onClick={generateImage}
                disabled={isGenerating || !prompt.trim()}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Image'
                )}
              </Button>
            </div>

            {/* Result */}
            <div className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                {generatedImage ? (
                  <img
                    src={generatedImage}
                    alt="Generated image"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-gray-500">
                    <span className="text-4xl mb-2 block">🖼️</span>
                    Generated image will appear here
                  </div>
                )}
              </div>

              {generatedImage && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">
                    Generated using: <strong>{serviceUsed}</strong>
                    {seed && <span> | Seed: {seed}</span>}
                  </div>
                  <Button
                    onClick={downloadImage}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Image
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
