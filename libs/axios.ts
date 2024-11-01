import { Agent } from 'https';

import axios from 'axios';
import rateLimit from 'axios-rate-limit';
import axiosRetry from 'axios-retry';

import { isValidHtmlContent, shortHtml } from '@/utils/dom';
import { SCRAPER } from '@/constants/scraper';

import type { AxiosError, AxiosInstance, AxiosResponse, CreateAxiosDefaults } from 'axios';

export type ResponseData = string;

const { timeout, numberOfRetries, delayBetweenRequests } = SCRAPER.axios;

export const axiosConfig: CreateAxiosDefaults = {
  timeout,
  httpsAgent: new Agent({
    timeout,
    keepAlive: true,
    scheduling: 'fifo',
  }),
  maxRate: [100, 1024], // works
};

/** Must use singleton. */
export default class MyAxiosInstance {
  private static instance: AxiosInstance;

  public static getInstance(): AxiosInstance {
    if (!MyAxiosInstance.instance) MyAxiosInstance.instance = axios.create(axiosConfig);

    return MyAxiosInstance.instance;
  }
}

/** Without retries. */
export const axiosInstance = MyAxiosInstance.getInstance();

/** Main retry instance to use. */
export const axiosRetryInstance = rateLimit(axiosInstance, {
  maxRequests: 1, // Only one request at a time
  perMilliseconds: delayBetweenRequests,
});

axiosRetry(axiosRetryInstance, {
  retries: numberOfRetries,
  shouldResetTimeout: true,
  onRetry: (retryCount: number, error: AxiosError) => {
    console.error(`onRetry error, count: ${retryCount}, code: ${error.code}`);
  },
  onMaxRetryTimesExceeded: (error: AxiosError, retryCount: number) => {
    console.error(`onMaxRetryTimesExceeded error, count: ${retryCount}, code: ${error.code}`);
  },
  // ! use this instead of retryCondition
  validateResponse: (response: AxiosResponse<ResponseData>): boolean => {
    console.log(`validateResponse success, response:data: ${shortHtml(response.data)}`);

    return isValidHtmlContent(response.data);
  },
});
