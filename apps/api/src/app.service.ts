import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  // 1. 🟢 Fix: Return the string expected by your unit tests
  getHello(): string {
    return 'Hello World!';
  }

  // 2. 🟢 Health Check Logic
  getHealthStatus() {
    return {
      status: 'ok',
      service: 'Triagen API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(), // 🔥 Senior Feature: Track how long the server has been alive
    };
  }
}
