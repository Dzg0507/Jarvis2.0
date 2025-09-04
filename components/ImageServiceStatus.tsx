'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Cpu, Cloud, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking';
  responseTime?: number;
  lastCheck?: Date;
  specs?: string;
}

export default function ImageServiceStatus() {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'Google Colab (16GB GPU)',
      url: 'https://e7774c08b4f2.ngrok-free.app',
      status: 'checking',
      specs: 'Tesla T4, 16GB VRAM, Float16'
    },
    {
      name: 'Local GPU (4GB)',
      url: 'http://localhost:5002',
      status: 'checking',
      specs: 'Local GPU, 4GB VRAM, CPU Fallback'
    }
  ]);

  const [selectedService, setSelectedService] = useState<string>('colab');

  const checkServiceHealth = async (service: ServiceStatus): Promise<ServiceStatus> => {
    const startTime = Date.now();
    try {
      const response = await fetch(`${service.url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          ...service,
          status: 'online',
          responseTime,
          lastCheck: new Date()
        };
      } else {
        return {
          ...service,
          status: 'offline',
          lastCheck: new Date()
        };
      }
    } catch (error) {
      return {
        ...service,
        status: 'offline',
        lastCheck: new Date()
      };
    }
  };

  const checkAllServices = async () => {
    const updatedServices = await Promise.all(
      services.map(service => checkServiceHealth(service))
    );
    setServices(updatedServices);
  };

  useEffect(() => {
    checkAllServices();
    const interval = setInterval(checkAllServices, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'offline':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'checking':
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getServiceIcon = (name: string) => {
    if (name.includes('Colab')) {
      return <Cloud className="w-5 h-5 text-blue-500" />;
    } else if (name.includes('Local')) {
      return <Cpu className="w-5 h-5 text-green-500" />;
    }
    return <Zap className="w-5 h-5 text-purple-500" />;
  };

  return (
    <Card className="floating-card border-chimera-matrix/30">
      <CardHeader>
        <CardTitle className="text-chimera-matrix font-orbitron flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Image Generation Services
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {services.map((service, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border transition-all duration-200 ${
              selectedService === (service.name.includes('Colab') ? 'colab' : 'local')
                ? 'border-chimera-matrix bg-chimera-matrix/5'
                : 'border-chimera-matrix/20 hover:border-chimera-matrix/40'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                {getServiceIcon(service.name)}
                <div>
                  <div className="font-medium text-chimera-primary">{service.name}</div>
                  <div className="text-xs text-chimera-secondary">{service.specs}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(service.status)}
                <Badge
                  variant={service.status === 'online' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {service.status}
                </Badge>
              </div>
            </div>
            
            {service.responseTime && (
              <div className="text-xs text-chimera-secondary">
                Response time: {service.responseTime}ms
              </div>
            )}
            
            {service.lastCheck && (
              <div className="text-xs text-chimera-secondary">
                Last checked: {service.lastCheck.toLocaleTimeString()}
              </div>
            )}
          </div>
        ))}
        
        <div className="pt-4 border-t border-chimera-matrix/20">
          <div className="text-sm text-chimera-secondary mb-2">
            🎯 <strong>Smart Fallback:</strong> Colab first (faster), Local backup
          </div>
          <div className="text-xs text-chimera-secondary">
            • Colab: 512x512, 20 steps, ~1-2 minutes<br/>
            • Local: 256x256, 8 steps, ~3-5 minutes
          </div>
        </div>
        
        <Button
          onClick={checkAllServices}
          className="w-full btn-matrix"
          size="sm"
        >
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  );
}
