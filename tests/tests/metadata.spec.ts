import { expect, test } from '@playwright/test';
import axios from "axios";

test.describe('Meta tags', () => {
  test('check they are populated when the user-agent is a bot. @selfsigned', async ({
    page,
  }) => {
    const data: string = (await axios({
      url: 'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Properties/mapProperties.json',
      method: 'get',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; adidxbot/2.0; +http://www.bing.com/bingbot.htm)'
      }
    })).data;

    // Validate the name can be found
    await expect(data).toContain('MAP NAME');
    // Validate the description can be found
    await expect(data).toContain('Cette carte est tr');

    // But if we scan with a normal browser, we don't get the metadata:
    const data2: string = (await axios({
      url: 'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Properties/mapProperties.json',
      method: 'get',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:106.0) Gecko/20100101 Firefox/106.0'
      }
    })).data;

    // Validate the name can be found
    await expect(data2).not.toContain('MAP NAME');
    // Validate the description can be found
    await expect(data2).not.toContain('Cette carte est tr');
  });

  test('there is no error an funky URLs with bots. @selfsigned', async ({
                                                                          request,
                                                                        }) => {

    const result = await request.get(`http://play.workadventure.localhost/_/global/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; adidxbot/2.0; +http://www.bing.com/bingbot.htm)',
      }
    });

    // Note: in the future, it would be even better to return a 404 error code.
    await expect(result.ok()).toBeTruthy();
    await expect(await result.text()).not.toContain('Cette carte est tr');
  });
});
