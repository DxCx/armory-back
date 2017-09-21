import moment from 'moment';
import _ from 'lodash';

import * as testData from 'test/testData/db';
import { stubValidator } from 'test/utils';

const sandbox = sinon.sandbox.create();
const readGuild = sandbox.stub();
const readUser = sandbox.stub();
const createUser = sandbox.stub();
const updateUser = sandbox.stub();
const validate = sandbox.stub().returns(Promise.resolve());
const addResource = sandbox.stub();
const addRule = sandbox.stub();
const sendEmail = sandbox.spy();
const verifyHash = sandbox.stub();
const hashPassword = sandbox.stub();
const forgotMyPasswordTemplate = sandbox.stub();
const createPasswordReset = sandbox.stub();
const readPasswordReset = sandbox.stub();
const finishPasswordReset = sandbox.stub();
const claimStubUser = sandbox.stub();
const claimStubApiToken = sandbox.stub();
const tryFetch = sandbox.spy();

const gw2Api = {
  readAchievements: sandbox.spy(),
  readBank: sandbox.spy(),
  readInventory: sandbox.spy(),
  readMaterials: sandbox.spy(),
  readWallet: sandbox.spy(),
  readDungeons: sandbox.spy(),
  readDyes: sandbox.spy(),
  readFinishers: sandbox.spy(),
  readMasteries: sandbox.spy(),
  readMinis: sandbox.spy(),
  readOutfits: sandbox.spy(),
  readRaids: sandbox.spy(),
  readRecipes: sandbox.spy(),
  readSkins: sandbox.spy(),
  readTitles: sandbox.spy(),
  readCats: sandbox.spy(),
  readNodes: sandbox.spy(),
  readPvpStats: sandbox.spy(),
  readPvpGames: sandbox.spy(),
  readPvpStandings: sandbox.spy(),
  readPvpHeroes: sandbox.spy(),
  readMailCarriers: sandbox.spy(),
  readGliders: sandbox.spy(),
  readMail: sandbox.spy(),
};

const readToken = sandbox.stub();

describe('user controller', () => {
  const models = { neat: 'models' };
  const email = 'email@email.com';
  const fakeGuildId = 'fake-guild';
  const guild = testData.guild();
  const apiToken = testData.apiToken({
    primary: true,
    guilds: [guild.id, fakeGuildId].join(','),
  });
  const user = testData.user({ guilds: apiToken.guilds });

  const controller = proxyquire('api/controllers/user', {
    ...stubValidator({ addResource, addRule, validate }),
    'lib/email': {
      send: sendEmail,
    },
    'lib/services/guild': {
      read: readGuild,
    },
    'lib/services/user': {
      create: createUser,
      read: readUser,
      update: updateUser,
      createPasswordReset,
      readPasswordReset,
      finishPasswordReset,
      claimStubUser,
      claimStubApiToken,
    },
    'lib/password': {
      hashPassword,
      verifyHash,
    },
    'lib/email/templates': {
      forgotMyPassword: forgotMyPasswordTemplate,
    },
    'lib/services/fetch': { tryFetch },
    'lib/gw2': gw2Api,
    'lib/services/tokens': { read: readToken },
  })(models);

  afterEach(() => sandbox.reset());

  describe('initialisation', () => {
    it('should add init validator', () => {
      expect(addResource).to.have.been.calledWith({
        name: 'users',
        mode: 'create',
        rules: {
          alias: ['required', 'unique-alias', 'no-white-space', 'min5'],
          email: ['required', 'unique-email', 'no-white-space'],
          password: ['required', 'ezpassword', 'no-white-space'],
        },
      });

      expect(addResource).to.have.been.calledWith({
        name: 'users',
        mode: 'update-password',
        rules: {
          email: 'required',
          currentPassword: ['required'],
          password: ['required', 'ezpassword', 'no-white-space'],
        },
      });
    });
  });

  describe('create', () => {
    const passwordHash = '#$13123sdkjasd';
    let createdUser;

    beforeEach(async () => {
      hashPassword.withArgs(user.password).returns(passwordHash);
      createUser.withArgs(models, {
        ...user,
        passwordHash,
      }).returns(user);
      createdUser = await controller.create(user);
    });

    it('should validate user', () => {
      expect(validate).to.have.been.calledWith(user);
    });

    it('should hash password and create user', () => {
      expect(createdUser).to.equal(user);
    });
  });

  describe('read', () => {
    const cleanUser = (usr) => _.omit(usr, [
      'id',
      'passwordHash',
      'email',
      'token',
    ]);

    context('when user has a primary api key', () => {
      beforeEach(() => {
        readUser.withArgs(models, { alias: user.alias, email }).returns(Promise.resolve(user));
        readGuild.withArgs(models, { id: guild.id }).returns(Promise.resolve(guild));
        readGuild.withArgs(models, { id: fakeGuildId }).returns(Promise.resolve(null));
      });

      it('should return user data', async () => {
        const data = await controller.read({ alias: user.alias, email, ignorePrivacy: true });

        expect(tryFetch).to.have.been.calledWith(models, apiToken.id);

        expect(data).to.eql({
          ...cleanUser(user),
          guilds: [_.pick(guild, [
            'tag',
            'name',
            'id',
          ])],
        });
      });
    });

    context('when user does not have a primary api key', () => {
      const userNoGuilds = {
        ...user,
        guilds: null,
      };

      beforeEach(() => {
        readUser
          .withArgs(models, { alias: user.alias, email })
          .returns(Promise.resolve(userNoGuilds));
      });

      it('should return user data', async () => {
        const data = await controller.read({ alias: user.alias, email, ignorePrivacy: true });
        expect(data).to.eql({
          ...cleanUser(userNoGuilds),
          guilds: [],
        });
      });
    });
  });

  describe('updating password', () => {
    const hashedPassword = '123123DSADASD23123@#@#';
    const options = {
      email: user.email,
      password: 'new-password-man',
      currentPassword: 'old-password',
    };

    beforeEach(async () => {
      readUser.withArgs(models, { email: user.email }).returns(user);
      hashPassword.withArgs(options.password).returns(hashedPassword);
      await controller.updatePassword(options);
    });

    it('should validate', async () => {
      expect(validate).to.have.been.calledWith(options);
    });

    it('should verify hash against current password', () => {
      expect(verifyHash).to.have.been.calledWith(user.passwordHash, options.currentPassword);
    });

    it('should hash and change password', () => {
      expect(updateUser).to.have.been.calledWith(models, {
        id: user.id,
        passwordHash: hashedPassword,
      });
    });
  });

  describe('forgot my password', () => {
    context('starting', () => {
      context('when user is not found', () => {
        it('should throw error', () => {
          return expect(controller.forgotMyPasswordStart()).to.be.rejectedWith('User not found');
        });
      });

      context('when user is found', () => {
        const resetId = '123123-123123';
        const emailTemplate = '<email></email>';

        beforeEach(async () => {
          readUser.withArgs(models, { email }).returns(Promise.resolve(user));
          createPasswordReset.withArgs(models, user.id).returns(Promise.resolve(resetId));
          forgotMyPasswordTemplate.withArgs(resetId).returns(emailTemplate);
          await controller.forgotMyPasswordStart(email);
        });

        it('should create reset record', () => {
          expect(createPasswordReset).to.have.been.calledWith(models, user.id);
        });

        it('should send email with reset token', () => {
          expect(sendEmail).to.have.been.calledWith({
            subject: 'Forgot My Password',
            html: emailTemplate,
            to: email,
          });
        });
      });
    });

    context('finishing', () => {
      context('when reset token doesnt exist', () => {
        it('should throw error', () => {
          expect(controller.forgotMyPasswordFinish()).to.be.rejectedWith('Reset doesn\'t exist');
        });
      });

      context('when reset token exists', () => {
        const resetToken = testData.passwordReset();
        const newPassword = '123123123';

        beforeEach(async () => {
          readPasswordReset.withArgs(models, resetToken.id).returns(resetToken);
          hashPassword.withArgs(newPassword).returns(newPassword);
          await controller.forgotMyPasswordFinish(resetToken.id, newPassword);
        });

        it('should validate', async () => {
          expect(validate).to.have.been.calledWith({
            password: newPassword,
          });
        });

        it('should change password', () => {
          expect(updateUser).to.have.been.calledWith(models, {
            id: resetToken.UserId,
            passwordHash: newPassword,
          });
        });

        it('should finalise user reset token', () => {
          expect(finishPasswordReset).to.have.been.calledWith(models, resetToken.id);
        });
      });

      it('should throw error when token used', () => {
        const resetToken = testData.passwordReset({
          id: '123-1234',
          used: true,
        });

        const promise = controller.forgotMyPasswordFinish(resetToken.id, '1234');

        return expect(promise).to.be.rejectedWith('Reset doesn\'t exist');
      });

      it('should throw error when token expired', () => {
        const resetToken = testData.passwordReset({
          id: '123-1234',
          expires: moment().add(-5, 'days'),
        });

        const promise = controller.forgotMyPasswordFinish(resetToken.id, '1234');

        return expect(promise).to.be.rejectedWith('Reset doesn\'t exist');
      });
    });
  });

  describe('claiming a user', () => {
    const claimingUser = testData.user({
      password: 'sick-password',
    });

    beforeEach(async () => {
      hashPassword.withArgs(claimingUser.password).returns(claimingUser.password);
      await controller.claim(claimingUser);
    });

    it('should validate', async () => {
      expect(validate).to.have.been.calledWith(claimingUser);
    });

    it('should hash password and claim', () => {
      expect(claimStubUser).to.have.been.calledWith(models, {
        ...claimingUser,
        passwordHash: claimingUser.password,
      });
    });
  });

  describe('basic calls', () => {
    [
      ['achievements', gw2Api.readAchievements],
      ['bank', gw2Api.readBank],
      ['inventory', gw2Api.readInventory],
      ['materials', gw2Api.readMaterials],
      ['wallet', gw2Api.readWallet],
      ['dungeons', gw2Api.readDungeons],
      ['dyes', gw2Api.readDyes],
      ['finishers', gw2Api.readFinishers],
      ['masteries', gw2Api.readMasteries],
      ['minis', gw2Api.readMinis],
      ['outfits', gw2Api.readOutfits],
      ['raids', gw2Api.readRaids],
      ['recipes', gw2Api.readRecipes],
      ['skins', gw2Api.readSkins],
      ['titles', gw2Api.readTitles],
      ['homeCats', gw2Api.readCats],
      ['homeNodes', gw2Api.readNodes],
      ['pvpStats', gw2Api.readPvpStats],
      ['pvpGames', gw2Api.readPvpGames],
      ['pvpStandings', gw2Api.readPvpStandings],
      ['gliders', gw2Api.readGliders],
      ['mailCarriers', gw2Api.readMailCarriers],
      ['mail', gw2Api.readMail],
      ['pvpHeroes', gw2Api.readPvpHeroes],
    ].forEach(([funcName, spy]) => {
      it(`should call ${funcName}'s spy`, async () => {
        const token = '1234-1234';
        readUser.withArgs(models, { alias: user.alias, mode: 'lean' })
          .returns(Promise.resolve(user));
        readToken.withArgs(models, { id: user.tokenId }).returns(Promise.resolve({ token }));

        await controller[funcName](user.alias, { email: 'other-dude@lol.com' });

        expect(spy).to.have.been.calledWith(token);
      });

      it(`should grant access if user owns user for ${funcName}`, async () => {
        const token = '1234-1234';
        readUser.withArgs(models, { alias: user.alias, mode: 'lean' })
          .returns(Promise.resolve({
            ...user,
            privacy: [funcName],
          }));
        readToken.withArgs(models, { id: user.tokenId }).returns(Promise.resolve({ token }));

        await controller[funcName](user.alias, { email: user.email });

        expect(spy).to.have.been.calledWith(token);
      });

      it(`should reject access if user does not own and privacy is set for ${funcName}`, () => {
        const token = '1234-1234';
        readUser.withArgs(models, { alias: user.alias, mode: 'lean' })
          .returns(Promise.resolve({
            ...user,
            privacy: [funcName],
          }));
        readToken.withArgs(models, { id: user.tokenId }).returns(Promise.resolve({ token }));

        return expect(controller[funcName](user.alias, { email: 'nah@nah.com' }))
          .to.be.rejectedWith('unauthorized');
      });
    });
  });
});
