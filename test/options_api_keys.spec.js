import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';

/* global IITC */
/* eslint-disable no-unused-expressions */

await import('../core/code/options.js');
await import('../core/code/options_api_keys.js');

const options = IITC.options;

// a section the way a plugin adds the key of its service
const keySection = (service, key) => ({ title: service, namespace: 'api-keys', blocks: [{ type: 'string', key, title: 'API key' }] });

describe('API keys page', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is registered with no options of its own', () => {
    expect(options._pages['api-keys']).to.include({ title: 'API keys', namespace: 'api-keys' });
    expect(Object.values(options._definitions).filter((def) => def.pageId === 'api-keys' && def.extensionId === undefined)).to.be.empty;
  });

  it('keeps the keys of several plugins under one namespace, each with its own section', () => {
    options.extend('api-keys', 'test-keys-tiles', keySection('Tiles', 'test-tiles'));
    options.extend('api-keys', 'test-keys-geocoder', keySection('Geocoder', 'test-geocoder'));

    expect(options.get('api-keys.test-tiles')).to.equal('');
    expect(options.set('api-keys.test-geocoder', 'abc')).to.be.true;
    expect(options.exportValues({ sync: true })).to.deep.equal({ 'api-keys.test-geocoder': 'abc' });

    // a plugin declaring its section again keeps the keys of the others
    options.extend('api-keys', 'test-keys-tiles', keySection('Tiles', 'test-tiles-v2'));
    expect(options._definitions['api-keys.test-tiles']).to.be.undefined;
    expect(options._definitions['api-keys.test-tiles-v2']).to.include({ extensionId: 'test-keys-tiles' });
    expect(options._definitions['api-keys.test-geocoder']).to.include({ extensionId: 'test-keys-geocoder' });
    expect(options.get('api-keys.test-geocoder')).to.equal('abc');
  });
});
