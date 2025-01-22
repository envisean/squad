import { WebsiteIngestionTool } from '../tools/website-ingestion';
import { toolRegistry } from './tool-registry';

// Register the website ingestion tool
toolRegistry.register(new WebsiteIngestionTool()); 