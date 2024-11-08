import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';

/* global IITC */
/* eslint-disable no-unused-expressions */

if (!globalThis.document) globalThis.document = {};
if (!globalThis.window) globalThis.window = {};
globalThis.window.location = {};
if (!globalThis.IITC) globalThis.IITC = {};
globalThis.IITC.utils = {};
import('../core/code/utils.js');

describe('IITC.utils.getURLParam', () => {
  beforeEach(() => {
    // Reset the window.location.search to a known state
    Object.defineProperty(window.location, 'search', {
      writable: true,
      value: '',
    });
  });

  it('should return an empty string if the parameter is not present in the URL', () => {
    window.location.search = '?foo=bar&baz=qux';
    expect(IITC.utils.getURLParam('hello')).to.equal('');
  });

  it('should return the value of the parameter if it is present in the URL', () => {
    window.location.search = '?foo=bar&param=hello&baz=qux';
    expect(IITC.utils.getURLParam('param')).to.equal('hello');
  });

  it('should decode the parameter value', () => {
    window.location.search = '?param=hello%20world';
    expect(IITC.utils.getURLParam('param')).to.equal('hello world');
  });

  it('should handle multiple occurrences of the same parameter', () => {
    window.location.search = '?param=value1&param=value2';
    expect(IITC.utils.getURLParam('param')).to.equal('value1');
  });

  it('should handle an empty parameter value', () => {
    window.location.search = '?param=';
    expect(IITC.utils.getURLParam('param')).to.equal('');
  });

  it('should handle a parameter without a value', () => {
    window.location.search = '?param';
    expect(IITC.utils.getURLParam('param')).to.equal('');
  });

  it('should handle a URL with no query string', () => {
    window.location.search = '';
    expect(IITC.utils.getURLParam('param')).to.equal('');
  });
});

describe('IITC.utils.getCookie', () => {
  beforeEach(() => {
    document.cookie = '';
  });

  it('should return undefined if the cookie is not present', () => {
    expect(IITC.utils.getCookie('nonexistent')).to.be.undefined;
  });

  it('should return the value of the cookie if it is present', () => {
    document.cookie = 'mycookie=value';
    expect(IITC.utils.getCookie('mycookie')).to.equal('value');
  });

  it('should handle multiple cookies', () => {
    document.cookie = 'cookie1=value1; cookie2=value2';
    expect(IITC.utils.getCookie('cookie1')).to.equal('value1');
    expect(IITC.utils.getCookie('cookie2')).to.equal('value2');
  });

  it('should handle cookies with special characters and percent-encoded values', () => {
    document.cookie = 'cookie=value%20with spaces';
    expect(IITC.utils.getCookie('cookie')).to.equal('value with spaces');
  });

  it('should handle cookies with empty values', () => {
    document.cookie = 'cookie=';
    expect(IITC.utils.getCookie('cookie')).to.equal('');
  });
});

describe('IITC.utils.setCookie', () => {
  beforeEach(() => {
    document.cookie = '';
  });

  it('should write a cookie with the specified name and value', () => {
    IITC.utils.setCookie('testcookie', 'testvalue');
    expect(document.cookie).to.include('testcookie=testvalue');
  });

  it('should set the cookie expiration date to 10 years from now', () => {
    IITC.utils.setCookie('testcookie', 'testvalue');
    const expirationDate = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toUTCString();
    expect(document.cookie).to.include(`expires=${expirationDate}`);
  });

  it('should set the cookie path to /', () => {
    IITC.utils.setCookie('testcookie', 'testvalue');
    expect(document.cookie).to.include('path=/');
  });

  it('should overwrite an existing cookie with the same name', () => {
    IITC.utils.setCookie('testcookie', 'value1');
    IITC.utils.setCookie('testcookie', 'value2');
    expect(document.cookie).to.include('testcookie=value2');
  });
});

describe('IITC.utils.formatNumber', () => {
  it('should format a number with thousand separators', () => {
    expect(IITC.utils.formatNumber(1000)).to.equal('1\u2009000');
    expect(IITC.utils.formatNumber(12345)).to.equal('12\u2009345');
    expect(IITC.utils.formatNumber(123456789)).to.equal('123\u2009456\u2009789');
  });

  it('should handle negative numbers', () => {
    expect(IITC.utils.formatNumber(-1000)).to.equal('-1\u2009000');
    expect(IITC.utils.formatNumber(-12345)).to.equal('-12\u2009345');
    expect(IITC.utils.formatNumber(-123456789)).to.equal('-123\u2009456\u2009789');
  });

  it('should handle floating-point numbers', () => {
    expect(IITC.utils.formatNumber(1000.5)).to.equal('1\u2009000.5');
    expect(IITC.utils.formatNumber(12345.67)).to.equal('12\u2009345.67');
  });

  it('should handle zero', () => {
    expect(IITC.utils.formatNumber(0)).to.equal('0');
  });

  it('should handle non-numeric input', () => {
    expect(IITC.utils.formatNumber('abc')).to.equal('abc');
    expect(IITC.utils.formatNumber(null)).to.equal('');
    expect(IITC.utils.formatNumber(undefined)).to.equal('');
  });
});

describe('IITC.utils.zeroPad', () => {
  it('should pad a number with zeros to the desired length', () => {
    expect(IITC.utils.zeroPad(5, 3)).to.equal('005');
    expect(IITC.utils.zeroPad(42, 5)).to.equal('00042');
    expect(IITC.utils.zeroPad(1234, 6)).to.equal('001234');
  });

  it('should handle negative numbers', () => {
    expect(IITC.utils.zeroPad(-5, 2)).to.equal('-5');
  });

  it('should handle floating-point numbers', () => {
    expect(IITC.utils.zeroPad(5.67, 3)).to.equal('5.67');
  });

  it('should handle zero', () => {
    expect(IITC.utils.zeroPad(0, 3)).to.equal('000');
  });

  it('should handle non-numeric input', () => {
    expect(IITC.utils.zeroPad('abc', 3)).to.equal('abc');
  });

  it('should not add unnecessary zeros if the number is already longer than the desired length', () => {
    expect(IITC.utils.zeroPad(1234, 3)).to.equal('1234');
  });
});

describe('IITC.utils.unixTimeToString', () => {
  it('should return null when no timestamp is provided', () => {
    expect(IITC.utils.unixTimeToString(null)).to.be.null;
    expect(IITC.utils.unixTimeToString(undefined)).to.be.null;
  });

  it('should return the time in HH:mm:ss format when the timestamp is for today', () => {
    const now = new Date();
    const timestamp = now.getTime();
    const timeString = IITC.utils.unixTimeToString(timestamp);

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const expectedTime = timeFormatter.format(now);
    expect(timeString).to.equal(expectedTime);
  });

  it('should return both date and time in YYYY-MM-DD HH:mm:ss format when full is true', () => {
    const testDate = new Date(2023, 10, 5, 14, 30, 45); // November 5, 2023, 14:30:45
    const timestamp = testDate.getTime();
    const dateTimeString = IITC.utils.unixTimeToString(timestamp, true);
    expect(dateTimeString).to.equal('2023-11-05 14:30:45');
  });

  it('should handle string timestamps', () => {
    const someOtherDay = new Date(2023, 10, 5, 14, 30, 45);
    const timestamp = someOtherDay.getTime();
    const dateString = IITC.utils.unixTimeToString(timestamp.toString());
    expect(dateString).to.equal('2023-11-05');
  });
});

describe('IITC.utils.unixTimeToDateTimeString', () => {
  it('should return null if time is undefined', () => {
    const result = IITC.utils.unixTimeToDateTimeString(undefined);
    expect(result).to.be.null;
  });

  it('should return null if time is 0', () => {
    const result = IITC.utils.unixTimeToDateTimeString(0);
    expect(result).to.be.null;
  });

  it('should return date and time in local timezone without milliseconds if millisecond is false', () => {
    const testDate = new Date(2023, 9, 15, 13, 45, 30); // October 15, 2023, 13:45:30
    const timestamp = testDate.getTime();
    const dateTimeString = IITC.utils.unixTimeToDateTimeString(timestamp, false);
    expect(dateTimeString).to.equal('2023-10-15 13:45:30');
  });

  it('should return date and time in local timezone with milliseconds if millisecond is true', () => {
    const testDate = new Date(2023, 9, 15, 13, 45, 30, 123); // October 15, 2023, 13:45:30.123
    const timestamp = testDate.getTime();
    const dateTimeString = IITC.utils.unixTimeToDateTimeString(timestamp, true);
    expect(dateTimeString).to.equal('2023-10-15 13:45:30.123');
  });

  it('should handle a timestamp provided as a string and return the correct date and time', () => {
    const testDate = new Date(2023, 5, 20, 8, 15, 45); // June 20, 2023, 08:15:45
    const timestamp = String(testDate.getTime());
    const dateTimeString = IITC.utils.unixTimeToDateTimeString(timestamp);
    expect(dateTimeString).to.equal('2023-06-20 08:15:45');
  });

  it('should return date and time without milliseconds when millisecond parameter is omitted', () => {
    const testDate = new Date(2024, 0, 1, 0, 0, 0); // January 1, 2024, 00:00:00
    const timestamp = testDate.getTime();
    const dateTimeString = IITC.utils.unixTimeToDateTimeString(timestamp);
    expect(dateTimeString).to.equal('2024-01-01 00:00:00');
  });
});

describe('IITC.utils.unixTimeToHHmm', () => {
  it('should return null if time is undefined', () => {
    const result = IITC.utils.unixTimeToHHmm(undefined);
    expect(result).to.be.null;
  });

  it('should return null if time is 0', () => {
    const result = IITC.utils.unixTimeToHHmm(0);
    expect(result).to.be.null;
  });

  it('should return time in HH:mm format for a valid UNIX timestamp', () => {
    const testDate = new Date(2023, 9, 15, 13, 5); // October 15, 2023, 13:05
    const timestamp = testDate.getTime();
    const timeString = IITC.utils.unixTimeToHHmm(timestamp);
    expect(timeString).to.equal('13:05');
  });

  it('should handle a timestamp as a string and return the correct time in HH:mm format', () => {
    const testDate = new Date(2023, 9, 15, 21, 45); // October 15, 2023, 21:45
    const timestamp = String(testDate.getTime());
    const timeString = IITC.utils.unixTimeToHHmm(timestamp);
    expect(timeString).to.equal('21:45');
  });
});

describe('IITC.utils.formatInterval', () => {
  it('should return only seconds if the interval is less than a minute', () => {
    const result = IITC.utils.formatInterval(45); // 45 seconds
    expect(result).to.equal('45s');
  });

  it('should include days, hours, minutes, and seconds if interval is long enough', () => {
    const result = IITC.utils.formatInterval(1 * 86400 + 1 * 3600 + 1 * 60 + 1); // 1 day, 1 hour, 1 minute, 1 second
    expect(result).to.equal('1d 1h 1m 1s');
  });

  it('should limit the number of terms to maxTerms', () => {
    const result = IITC.utils.formatInterval(1 * 86400 + 1 * 3600 + 1 * 60 + 1, 2); // 1 day, 1 hour (limit 2 terms)
    expect(result).to.equal('1d 1h');
  });

  it('should return "0s" for an interval of 0 seconds', () => {
    const result = IITC.utils.formatInterval(0);
    expect(result).to.equal('0s');
  });

  it('should handle an interval with only full days', () => {
    const result = IITC.utils.formatInterval(2 * 86400); // 2 days
    expect(result).to.equal('2d');
  });

  it('should handle an interval with only full hours', () => {
    const result = IITC.utils.formatInterval(2 * 3600); // 2 hours
    expect(result).to.equal('2h');
  });

  it('should handle an interval with only full minutes', () => {
    const result = IITC.utils.formatInterval(2 * 60); // 2 minutes
    expect(result).to.equal('2m');
  });
});

describe('IITC.utils.formatDistance', () => {
  it('should format distance in meters for values below 10 000', () => {
    const result = IITC.utils.formatDistance(500); // 500 meters
    expect(result).to.equal('500m');
  });

  it('should round distance to the nearest meter if below 10 000', () => {
    const result = IITC.utils.formatDistance(999.6); // rounded to 1000 meters
    expect(result).to.equal('1\u2009000m');
  });

  it('should format distance in kilometers with two decimal places if above 10 000 meters', () => {
    const result = IITC.utils.formatDistance(12345); // 12.35 kilometers
    expect(result).to.equal('12km');
  });

  it('should format exactly 10 kilometers, not 10 000 meters', () => {
    const result = IITC.utils.formatDistance(10000); // 10 000 meters
    expect(result).to.equal('10km');
  });

  it('should format large distances in kilometers with two decimal places', () => {
    const result = IITC.utils.formatDistance(987654); // 987.65 kilometers
    expect(result).to.equal('988km');
  });

  it('should handle zero distance as "0m"', () => {
    const result = IITC.utils.formatDistance(0);
    expect(result).to.equal('0m');
  });

  it('should handle negative distances correctly', () => {
    const result = IITC.utils.formatDistance(-500); // -500 meters
    expect(result).to.equal('-500m');
  });
});

describe('IITC.utils.escapeJavascriptString', () => {
  it('should escape double quotes in the string', () => {
    const result = IITC.utils.escapeJavascriptString('Hello "World"');
    expect(result).to.equal('Hello \\"World\\"');
  });

  it('should escape single quotes in the string', () => {
    const result = IITC.utils.escapeJavascriptString("It's a test");
    expect(result).to.equal("It\\'s a test");
  });

  it('should escape backslashes in the string', () => {
    const result = IITC.utils.escapeJavascriptString('Back\\slash');
    expect(result).to.equal('Back\\\\slash');
  });

  it('should escape a mix of special characters in the string', () => {
    const result = IITC.utils.escapeJavascriptString('He said, "It\'s \\awesome!"');
    expect(result).to.equal('He said, \\"It\\\'s \\\\awesome!\\"');
  });

  it('should handle an empty string', () => {
    const result = IITC.utils.escapeJavascriptString('');
    expect(result).to.equal('');
  });

  it('should return the same string if no special characters are present', () => {
    const result = IITC.utils.escapeJavascriptString('Just a regular string');
    expect(result).to.equal('Just a regular string');
  });

  it('should treat non-string inputs as strings', () => {
    const result = IITC.utils.escapeJavascriptString(12345);
    expect(result).to.equal('12345');
  });
});

describe('IITC.utils.prettyEnergy', () => {
  it('should return the energy value as is if it is less than 1000', () => {
    const result = IITC.utils.prettyEnergy(500);
    expect(result).to.equal(500);
  });

  it('should format energy as is if it is exactly 1000', () => {
    const result = IITC.utils.prettyEnergy(1000);
    expect(result).to.equal(1000);
  });

  it('should round and format energy in 2 k if it is greater than 1000', () => {
    const result = IITC.utils.prettyEnergy(1500);
    expect(result).to.equal('2k');
  });

  it('should round energy to the nearest 2 k', () => {
    const result = IITC.utils.prettyEnergy(2499);
    expect(result).to.equal('2k');
  });

  it('should handle very large energy values correctly', () => {
    const result = IITC.utils.prettyEnergy(1234567);
    expect(result).to.equal('1235k');
  });

  it('should return 0 for energy value of 0', () => {
    const result = IITC.utils.prettyEnergy(0);
    expect(result).to.equal(0);
  });

  it('should handle negative energy values without formatting to thousands', () => {
    const result = IITC.utils.prettyEnergy(-500);
    expect(result).to.equal(-500);
  });
});

describe('IITC.utils.uniqueArray', () => {
  it('should remove duplicate numbers', () => {
    const result = IITC.utils.uniqueArray([1, 2, 2, 3, 4, 4, 5]);
    expect(result).to.deep.equal([1, 2, 3, 4, 5]);
  });

  it('should return the same array if there are no duplicates', () => {
    const result = IITC.utils.uniqueArray([1, 2, 3, 4, 5]);
    expect(result).to.deep.equal([1, 2, 3, 4, 5]);
  });

  it('should handle an array with all identical elements', () => {
    const result = IITC.utils.uniqueArray([1, 1, 1, 1]);
    expect(result).to.deep.equal([1]);
  });

  it('should return an empty array if input is empty', () => {
    const result = IITC.utils.uniqueArray([]);
    expect(result).to.deep.equal([]);
  });
});

describe('IITC.utils.genFourColumnTable', () => {
  beforeEach(() => {
    // Mock IITC.utils.escapeHtmlSpecialChars
    IITC.utils.escapeHtmlSpecialChars = (msg) => msg;
  });

  it('should generate an empty string for an empty array', () => {
    const result = IITC.utils.genFourColumnTable([]);
    expect(result).to.equal('');
  });

  it('should generate a single row with two data cells for one block', () => {
    const blocks = [['Header1', 'Data1', 'Tooltip1']];
    const result = IITC.utils.genFourColumnTable(blocks);
    /* eslint-disable-next-line */
    const check = `` +
      `<tr>` +
      `<td title="Tooltip1">Data1</td>` +
      `<th title="Tooltip1">Header1</th>` +
      `<td></td>` +
      `<td></td>` +
      `</tr>`;
    expect(result).to.equal(check);
  });

  it('should generate a table with two rows for two blocks', () => {
    const blocks = [
      ['Header1', 'Data1', 'Tooltip1'],
      ['Header2', 'Data2', 'Tooltip2'],
    ];
    const result = IITC.utils.genFourColumnTable(blocks);
    /* eslint-disable-next-line */
    const check = `` +
      `<tr>` +
      `<td title="Tooltip1">Data1</td>` +
      `<th title="Tooltip1">Header1</th>` +
      `<th title="Tooltip2">Header2</th>` +
      `<td title="Tooltip2">Data2</td>` +
      `</tr>`;
    expect(result).to.equal(check);
  });

  it('should correctly handle an array with an odd number of blocks by adding empty cells at the end', () => {
    const blocks = [
      ['Header1', 'Data1', 'Tooltip1'],
      ['Header2', 'Data2', 'Tooltip2'],
      ['Header3', 'Data3', 'Tooltip3'],
    ];
    const result = IITC.utils.genFourColumnTable(blocks);
    /* eslint-disable-next-line */
    const check = `` +
      `<tr>` +
      `<td title="Tooltip1">Data1</td>` +
      `<th title="Tooltip1">Header1</th>` +
      `<th title="Tooltip2">Header2</th>` +
      `<td title="Tooltip2">Data2</td>` +
      `</tr>` +
      `<tr>` +
      `<td title="Tooltip3">Data3</td>` +
      `<th title="Tooltip3">Header3</th>` +
      `<td></td>` +
      `<td></td>` +
      `</tr>`;
    expect(result).to.equal(check);
  });

  it('should handle missing title gracefully', () => {
    const blocks = [
      ['Header1', 'Data1'],
      ['Header2', 'Data2'],
    ];
    const result = IITC.utils.genFourColumnTable(blocks);
    /* eslint-disable-next-line */
    const check = `` +
      `<tr>` +
      `<td>Data1</td>` +
      `<th>Header1</th>` +
      `<th>Header2</th>` +
      `<td>Data2</td>` +
      `</tr>`;
    expect(result).to.equal(check);
  });
});

describe('IITC.utils.clamp', () => {
  it('should return the value itself if it is within the range', () => {
    const result = IITC.utils.clamp(5, 10, -10);
    expect(result).to.equal(5);
  });

  it('should clamp the value to the maximum if it exceeds the maximum', () => {
    const result = IITC.utils.clamp(15, 10, -10);
    expect(result).to.equal(10);
  });

  it('should clamp the value to the minimum if it is below the minimum', () => {
    const result = IITC.utils.clamp(-15, 10, -10);
    expect(result).to.equal(-10);
  });

  it('should clamp to 0 if the maximum and minimum are both 0', () => {
    const result = IITC.utils.clamp(5, 0, 0);
    expect(result).to.equal(0);
  });

  it('should handle negative maximum and minimum values', () => {
    const result = IITC.utils.clamp(-5, -2, -10);
    expect(result).to.equal(-5);
  });
});
