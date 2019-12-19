import PWAManifestGenerator, { Manifest } from '../index';
import testConfigs, { Config, ResultConfig, ErrorConfig } from './testConfigs';
jest.setTimeout(30000);
const testConfig = ({ config, msg, ...props }: Config): void =>
  test.concurrent(msg || 'icons are correctly generated', async () => {
    let generator: PWAManifestGenerator;
    let generatedHTML: string;
    let generatedIcons: string[];
    let generatedBrowserConfig: string;
    let generatedManifest: Manifest;
    try {
      generator = new PWAManifestGenerator(
        config,
        {
          baseURL: './',
          resolveDir: __dirname
        },
        {
          name: 'tester',
          desc: 'test'
        }
      );
      generator.hashMethod = 'content';
      const result = await generator.generate();
      generatedHTML = result.html;
      generatedIcons = Object.keys(result.generatedIcons);
      generatedBrowserConfig = result.browserConfig;
      generatedManifest = result.manifest;
    } catch (e) {
      const throws = (props as ErrorConfig).throws;
      if (throws && new RegExp(throws).test(e)) return;
      throw new Error(e);
    }
    const { logOutput, throws } = props as ResultConfig & ErrorConfig;
    if (throws) throw new Error('Did not throw for error config.');
    if (logOutput)
      console.log(
        msg +
          '\nFiles: [' +
          generatedIcons
            .map(str => "'" + str.replace(/'/, "\\'") + "'")
            .join(', ') +
          ']'
      );
    expect(generatedIcons).toMatchSnapshot();
    expect(generatedManifest).toMatchSnapshot();
    expect(generatedBrowserConfig).toMatchSnapshot();
    expect(generatedHTML).toMatchSnapshot();
  });
for (const conf of testConfigs) {
  testConfig(conf);
}
