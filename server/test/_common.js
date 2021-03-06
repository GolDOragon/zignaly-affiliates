import supertest from 'supertest';
import app from '../app';
import { USER_ROLES } from '../model/user';
import Campaign, { DISCOUNT_TYPES, SERVICE_TYPES } from '../model/campaign';
import Upload from '../model/upload';
import Chain from '../model/chain';
import { getChainData } from '../service/chain-processor';

export const getSampleData = (role = USER_ROLES.AFFILIATE) => ({
  name: 'Alex',
  email: 'alex@xfuturum.com',
  password: 'qwerty',
  role,
});

export const request = (method, url, token) =>
  supertest(app)
    [method](`/api/v1/${url}`)
    .set({
      Accept: 'application/json',
      'Content-type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });

export const uploadRequest = (file, token) =>
  supertest(app)
    .post(`/api/v1/upload`)
    .attach('media', file)
    .set({ Authorization: `Bearer ${token}` });

export const getCampaignData = async () => ({
  shortDescription: 'Abra Cadabra',
  name: 'Abra Cadabra',
  description: 'Abra Cadabra',
  termsAndConditions: 'Cadabra Abra',
  publish: true,
  serviceType: SERVICE_TYPES.MONTHLY_FEE,
  rewardValue: 500,
  rewardThreshold: 1000,
  media: [await new Upload({}).save()],
  zignalyServiceIds: ['1111'],
  landingPage: '1111',
  discountCodes: [
    {
      code: '1234',
      type: DISCOUNT_TYPES.PERCENT,
      value: 5,
    },
  ],
});

export const createCampaign = async (merchantToken, extraData = {}) =>
  request('post', 'campaign', merchantToken)
    .send({ ...(await getCampaignData()), ...extraData })
    .expect(201);

export const register = data => request('post', 'user').send(data);

export const me = token => request('get', 'user/me', token);

export const update = (data, token) =>
  request('put', 'user/me', token).send(data);

export const login = data => request('post', 'user/auth').send(data);

export const requestReset = email =>
  request('post', 'user/request-reset').send({ email });

export const validateReset = token =>
  request('get', `user/can-reset?token=${token}`).send({ token });

export const performReset = data => request('post', 'user/reset').send(data);

export const getAffiliate = async () =>
  (
    await register({
      name: 'Alex',
      email: `alex${Math.random()}${Date.now()}@xfuturum.com`,
      password: 'qwerty',
      role: USER_ROLES.AFFILIATE,
    })
  ).body;

export const getAffiliateToken = async () => (await getAffiliate()).token;

export const getMerchant = async () =>
  (
    await register({
      name: 'Alex',
      email: `alex${Math.random()}${Date.now()}@xfuturum.com`,
      password: 'qwerty',
      role: USER_ROLES.MERCHANT,
    })
  ).body;

export const getMerchantToken = async () => (await getMerchant()).token;

export const getMerchantAndAffiliateAndStuff = async () => {
  const merchantToken = await getMerchantToken();
  const affiliateToken = await getAffiliateToken();
  const { body: campaignData } = await createCampaign(merchantToken, {
    publish: false,
    rewardDurationMonths: 1,
  });
  const {
    body: { _id: affiliateId },
  } = await me(affiliateToken);
  const {
    body: { _id: merchantId },
  } = await me(merchantToken);
  await request(
    'post',
    `campaign/activate/${campaignData._id}`,
    affiliateToken,
  );
  return {
    affiliateId,
    merchantId,
    merchantToken,
    affiliateToken,
    campaignData,
  };
};

export const getMerchantAndAffiliateAndChainAndStuff = async () => {
  const data = await getMerchantAndAffiliateAndStuff();
  const { affiliateId, campaignData } = data;
  const { _id: id, rewardValue } = campaignData;
  await createPaymentsForCampaign(campaignData, affiliateId);
  await Campaign.findOneAndUpdate(
    { _id: id },
    { $set: { rewardThreshold: rewardValue } },
  );
  return data;
};

export const createPaymentsForCampaign = async (
  { _id: id, zignalyServiceIds },
  affiliateId,
) => {
  const chainData = await getChainData({
    visit: {
      campaign_id: id,
      affiliate_id: affiliateId,
      event_id: 1,
      event_date: Date.now(),
    },
    payments: payments.map(x => ({
      ...x,
      service_id: zignalyServiceIds[0],
    })),
  });
  await new Chain(chainData).save();
  return chainData;
};

export const payments = [
  {
    event_date: '2020-01-01T10:00:00.923Z',
    quantity: '2',
    amount: '80.00',
  },
  {
    event_date: '2020-01-15T10:00:00.923Z',
    quantity: '2',
    amount: '80.00',
  },
  {
    event_date: '2020-02-15T10:00:00.923Z',
    quantity: '1',
    amount: '50.00',
  },
  {
    event_date: '2020-03-02T10:00:00.923Z',
    quantity: '3',
    amount: '120.00',
  },
];
