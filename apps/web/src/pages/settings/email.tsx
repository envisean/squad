import { GmailSetup } from '../../components/email/GmailSetup';
import { PageHeader } from '../../components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card } from '../../components/ui/card';

export default function EmailSettingsPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader
        title="Email Settings"
        description="Configure your email assistant and preferences"
      />

      <Tabs defaultValue="connections" className="space-y-6">
        <TabsList>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="filters">Filters</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-6">
          <GmailSetup />
        </TabsContent>

        <TabsContent value="preferences">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Assistant Preferences</h3>
            {/* Add preferences form here */}
          </Card>
        </TabsContent>

        <TabsContent value="filters">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Email Filters</h3>
            {/* Add filters configuration here */}
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Response Templates</h3>
            {/* Add templates management here */}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}