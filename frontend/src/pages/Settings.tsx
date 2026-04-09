import { useState, useEffect } from 'react';
import { configApi, type AIConfig } from '../api/newsletter';

export default function Settings() {
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [formData, setFormData] = useState({
    provider: 'siliconflow',
    api_key: '',
    base_url: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-7B-Instruct',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await configApi.getAI();
      setAiConfig(data);
      setFormData({
        provider: data.provider,
        api_key: '',
        base_url: data.base_url,
        model: data.model,
      });
    } catch (err) {
      console.error('Failed to load config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      await configApi.updateAI(formData);
      setTestResult({ success: true, message: 'AI 配置已保存' });
      loadConfig();
    } catch (err) {
      setTestResult({ success: false, message: '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await configApi.testAI();
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, message: '测试连接失败' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-[#0d4656] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9f7]">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-[#f9f9f7]/80 backdrop-blur-xl border-b border-transparent">
        <div className="flex justify-between items-center w-full px-8 py-6 max-w-screen-2xl mx-auto">
          <h1 className="font-['Newsreader'] italic text-2xl text-[#1a1c1b]">Settings</h1>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex gap-6">
              <a className="text-[#5e5e5e] font-sans hover:text-[#0d4656] transition-colors text-sm" href="#">Briefing</a>
              <a className="text-[#5e5e5e] font-sans hover:text-[#0d4656] transition-colors text-sm" href="#">Interests</a>
              <a className="text-[#5e5e5e] font-sans hover:text-[#0d4656] transition-colors text-sm" href="#">Sources</a>
              <a className="text-[#0d4656] font-bold border-b-2 border-[#0d4656] pb-1 transition-colors text-sm" href="#">Settings</a>
            </div>
            <span className="material-symbols-outlined text-[#40484b] cursor-pointer hover:scale-95 duration-200">account_circle</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* Page Introduction */}
        <div className="mb-16">
          <h2 className="font-['Newsreader'] text-5xl font-light text-[#1a1c1b] mb-4">The Digital Brain</h2>
          <p className="text-[#5e5e5e] max-w-2xl text-lg leading-relaxed">
            Configure the cognitive architecture of your MindFlow instance. Choose your preferred model provider and optimize the processing pipeline for your curated briefing.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Configuration Form - Left Column */}
          <section className="lg:col-span-7 space-y-12">
            {/* LLM Provider Section */}
            <div className="space-y-8">
              <div className="border-l-4 border-[#0d4656] pl-6">
                <h3 className="font-['Newsreader'] text-2xl text-[#1a1c1b]">LLM Provider</h3>
                <p className="text-[#5e5e5e] text-sm">Select the intelligence engine powering your summaries.</p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* AI Provider */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#40484b] block">AI Provider</label>
                  <div className="relative">
                    <select
                      value={formData.provider}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                      className="w-full appearance-none bg-[#ffffff] border border-[#c0c8cb]/15 rounded-lg px-4 py-3 text-[#1a1c1b] focus:outline-none focus:ring-1 focus:ring-[#0d4656]/20"
                    >
                      <option value="siliconflow">硅基流动 (SiliconFlow)</option>
                      <option value="minimax">MiniMax</option>
                      <option value="custom">自定义 OpenAI 兼容接口</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-3.5 text-[#40484b] pointer-events-none">unfold_more</span>
                  </div>
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#40484b] block">API Key</label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={formData.api_key}
                      onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                      placeholder={aiConfig?.provider ? '已配置（不修改请留空）' : '请输入 API Key'}
                      className="w-full bg-[#ffffff] border border-[#c0c8cb]/15 rounded-lg px-4 py-3 text-[#1a1c1b] focus:outline-none focus:ring-1 focus:ring-[#0d4656]/20 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-3.5 text-[#40484b] cursor-pointer hover:text-[#0d4656] transition-colors"
                    >
                      <span className="material-symbols-outlined">{showApiKey ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                {/* Base URL and Model */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[#40484b] block">Base URL</label>
                    <input
                      type="url"
                      value={formData.base_url}
                      onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                      placeholder="https://api.anthropic.com"
                      className="w-full bg-[#ffffff] border border-[#c0c8cb]/15 rounded-lg px-4 py-3 text-[#1a1c1b] focus:outline-none focus:ring-1 focus:ring-[#0d4656]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[#40484b] block">Model Version</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="例如：Qwen/Qwen2.5-7B-Instruct"
                      className="w-full bg-[#ffffff] border border-[#c0c8cb]/15 rounded-lg px-4 py-3 text-[#1a1c1b] focus:outline-none focus:ring-1 focus:ring-[#0d4656]/20"
                    />
                  </div>
                </div>
              </div>

              {/* Connection Status Bar */}
              <div className="flex items-center justify-between p-6 bg-[#f4f4f2] rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-600">check_circle</span>
                  <span className="text-sm font-medium text-[#1a1c1b]">Connection Verified</span>
                </div>
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="px-6 py-2 border border-[#c0c8cb] text-[#40484b] text-[11px] font-bold uppercase tracking-widest rounded hover:bg-[#e8e8e6] transition-colors disabled:opacity-50"
                >
                  {testing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#40484b] border-t-transparent rounded-full animate-spin" />
                      测试中...
                    </span>
                  ) : (
                    'Test Connection'
                  )}
                </button>
              </div>
            </div>

            {/* Test Result */}
            {testResult && (
              <div
                className={`p-4 rounded-lg text-sm ${
                  testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {testResult.message}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-8 border-t border-[#c0c8cb]/15 flex justify-end gap-4">
              <button className="px-8 py-3 text-[#5e5e5e] text-[11px] font-bold uppercase tracking-widest hover:text-[#1a1c1b] transition-colors">
                Reset to Defaults
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-10 py-3 bg-[#0d4656] text-white rounded-lg text-[11px] font-bold uppercase tracking-widest shadow-sm hover:bg-[#2c5e6e] transition-all disabled:opacity-50"
              >
                {saving ? '保存中...' : 'Save Architecture'}
              </button>
            </div>
          </section>

          {/* System Status Sidebar - Right Column */}
          <aside className="lg:col-span-5 space-y-6">
            {/* System Vitality Card */}
            <div className="bg-[#f4f4f2] p-8 rounded-2xl">
              <h3 className="font-['Newsreader'] text-xl mb-6 text-[#1a1c1b]">System Vitality</h3>
              <div className="space-y-8">
                {/* Memory Usage */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[#5e5e5e]">Memory Usage</label>
                    <span className="text-sm font-bold text-[#1a1c1b]">1.2 GB / 4.0 GB</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#e2e3e1] rounded-full overflow-hidden">
                    <div className="h-full bg-[#0d4656] w-1/3 rounded-full"></div>
                  </div>
                  <p className="text-[11px] text-[#40484b]">Embedded vectors & local cache optimization active.</p>
                </div>

                {/* Processing Queue */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[#5e5e5e]">Processing Queue</label>
                    <span className="text-sm font-bold text-[#1a1c1b]">Idle</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 h-1 bg-[#0d4656]/20 rounded-full"></div>
                    <div className="flex-1 h-1 bg-[#0d4656]/20 rounded-full"></div>
                    <div className="flex-1 h-1 bg-[#0d4656]/20 rounded-full"></div>
                    <div className="flex-1 h-1 bg-[#0d4656]/20 rounded-full"></div>
                    <div className="flex-1 h-1 bg-[#0d4656]/20 rounded-full"></div>
                  </div>
                  <p className="text-[11px] text-[#40484b]">Last batch completed 14 minutes ago. 0 pending tasks.</p>
                </div>
              </div>
            </div>

            {/* Surprise Discovery Card */}
            <div className="bg-[#784f28]/10 p-8 rounded-2xl relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-['Newsreader'] text-xl text-[#5d3813] mb-2">Surprise Discovery</h3>
                <p className="text-sm text-[#643e19] leading-relaxed mb-6">
                  MindFlow found a potential architectural optimization by switching your local embedding model to a quantized 4-bit version.
                </p>
                <button className="flex items-center gap-2 text-[#5d3813] text-[11px] font-bold uppercase tracking-widest hover:translate-x-1 transition-transform">
                  Learn More <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
              <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-8xl text-[#5d3813]/10 rotate-12">lightbulb</span>
            </div>

            {/* Cognitive Health Card */}
            <div className="p-8 border border-[#c0c8cb]/15 rounded-2xl flex items-center gap-6">
              <div className="w-16 h-16 rounded-lg bg-[#e2e3e1] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#0d4656] text-3xl">neurology</span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#1a1c1b]">Cognitive Health</h4>
                <p className="text-xs text-[#5e5e5e] mt-1">Intelligence engine is responding at 42ms latency.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
