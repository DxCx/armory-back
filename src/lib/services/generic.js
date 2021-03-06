// @flow

import type { Sequelize } from 'flowTypes';

type Id = {
  key: string,
  value: string | number,
};

const delimiter = '|';

export async function hasPrivacy (model: Sequelize, privacy: string, { key, value }: Id) {
  const resource = await model.findOne({
    where: {
      [key]: value,
    },
  });

  const resourcePrivacy = resource.privacy || '';
  return resourcePrivacy.includes(privacy);
}

export async function setPrivacy (model: Sequelize, privacy: string, { key, value }: Id) {
  const resource = await model.findOne({
    where: {
      [key]: value,
    },
  });

  const resourcePrivacy = resource.privacy || '';
  if (resourcePrivacy.includes(privacy)) {
    return Promise.resolve();
  }

  const arr = resourcePrivacy.split(delimiter).filter(Boolean);
  arr.push(privacy);

  return model.update({
    privacy: arr.join(delimiter),
  }, {
    where: {
      [key]: value,
    },
  });
}

export async function removePrivacy (model: Sequelize, privacy: string, { key, value }: Id) {
  const resource = await model.findOne({
    where: {
      [key]: value,
    },
  });

  const resourcePrivacy = resource.privacy || '';
  if (!resourcePrivacy.includes(privacy)) {
    return Promise.resolve();
  }

  const arr = resourcePrivacy
    .split(delimiter)
    .filter(Boolean)
    .filter((priv) => priv !== privacy);

  return model.update({
    privacy: arr.join(delimiter),
  }, {
    where: {
      [key]: value,
    },
  });
}
