import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../src/config';

const MCP_SERVER_URL = config.mcp.serverUrl;

export async function GET(req: NextRequest) {
    const startTime = Date.now();
    
    const healthStatus: any = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {},
        responseTime: 0
    };

    // Test MCP Server connectivity
    try {
        const mcpStartTime = Date.now();
        const mcpResponse = await fetch(`${MCP_SERVER_URL}/tools`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });
        
        const mcpResponseTime = Date.now() - mcpStartTime;
        
        healthStatus.services.mcpServer = {
            status: mcpResponse.ok ? 'healthy' : 'unhealthy',
            statusCode: mcpResponse.status,
            responseTime: mcpResponseTime,
            url: MCP_SERVER_URL
        };

        if (mcpResponse.ok) {
            try {
                const data = await mcpResponse.json();
                healthStatus.services.mcpServer.toolsCount = data.tools?.length || 0;
            } catch (e) {
                healthStatus.services.mcpServer.parseError = 'Failed to parse tools response';
            }
        }
    } catch (error) {
        healthStatus.services.mcpServer = {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
            url: MCP_SERVER_URL
        };
        healthStatus.status = 'degraded';
    }

    // Test Chat API
    try {
        const chatStartTime = Date.now();
        const chatResponse = await fetch(`${req.nextUrl.origin}/api/chat`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000)
        });
        
        const chatResponseTime = Date.now() - chatStartTime;
        
        healthStatus.services.chatApi = {
            status: chatResponse.ok ? 'healthy' : 'unhealthy',
            statusCode: chatResponse.status,
            responseTime: chatResponseTime
        };

        if (chatResponse.ok) {
            try {
                const chatData = await chatResponse.json();
                healthStatus.services.chatApi.toolsLoaded = chatData.toolsLoaded;
                healthStatus.services.chatApi.chatInitialized = chatData.chatInitialized;
            } catch (e) {
                healthStatus.services.chatApi.parseError = 'Failed to parse chat status';
            }
        }
    } catch (error) {
        healthStatus.services.chatApi = {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
        healthStatus.status = 'degraded';
    }

    // Test Google AI API (basic connectivity)
    try {
        if (config.ai.apiKey) {
            healthStatus.services.googleAI = {
                status: 'configured',
                model: config.ai.modelName
            };
        } else {
            healthStatus.services.googleAI = {
                status: 'not_configured',
                error: 'API key not set'
            };
            healthStatus.status = 'degraded';
        }
    } catch (error) {
        healthStatus.services.googleAI = {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
        healthStatus.status = 'degraded';
    }

    // Overall health determination
    const unhealthyServices = Object.values(healthStatus.services).filter(
        (service: any) => service.status === 'unhealthy'
    ).length;

    if (unhealthyServices > 0) {
        healthStatus.status = unhealthyServices === Object.keys(healthStatus.services).length ? 'unhealthy' : 'degraded';
    }

    healthStatus.responseTime = Date.now() - startTime;

    // Return appropriate HTTP status
    const httpStatus = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthStatus, { status: httpStatus });
}

// Simple ping endpoint
export async function HEAD(req: NextRequest) {
    return new NextResponse(null, { 
        status: 200,
        headers: {
            'Cache-Control': 'no-cache',
            'X-Health-Check': 'ping'
        }
    });
}
