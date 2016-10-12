const controller = require('./index');
const Models = require('../../models');

describe('guild controller', () => {
  let sut;
  let models;

  beforeEach((done) => {
    models = new Models(testDb());
    models.sequelize.sync({
      force: true,
    }).then(() => {
      done();
    });

    sut = controller(models);
  });

  function setupTestData () {
    return models
      .User
      .create({
        email: 'cool@email.com',
        passwordHash: 'realhashseriously',
        alias: 'huedwell',
      })
      .then((user) => {
        return models
          .Gw2ApiToken
          .create({
            token: '938C506D-F838-F447-8B43-4EBF34706E0445B2B503-977D-452F-A97B-A65BB32D6F15',
            accountName: 'cool.4321',
            accountId: 'haha_id',
            permissions: 'cool,permissions',
            world: 1234,
            UserId: user.id,
          });
      })
      .then((token) => {
        return models
          .Gw2Character
          .create({
            name: 'character',
            race: 'race',
            gender: 'gender',
            profession: 'profession',
            level: 69,
            created: '01/01/90',
            age: 20,
            deaths: 2,
            guild: 'im-guild',
            Gw2ApiTokenToken: token.token,
          })
          .then(() => {
            return models
              .Gw2Character
              .create({
                name: 'character!',
                race: 'race',
                gender: 'gender',
                profession: 'profession',
                level: 69,
                created: '01/01/90',
                age: 20,
                deaths: 2,
                guild: 'im-guild',
                Gw2ApiTokenToken: token.token,
              });
          });
      })
      .then(() => {
        return models
          .Gw2Guild
          .create({
            id: 'im-guild',
            tag: 'tag',
            name: 'name',
          });
      });
  }

  it('should return guild and all associated characters', (done) => {
    setupTestData()
      .then(() => {
        return sut.read('name');
      })
      .then((guild) => {
        expect(guild).to.eql({
          name: 'name',
          id: 'im-guild',
          tag: 'tag',
          characters: [{
            accountName: 'cool.4321',
            world: 'world',
            name: 'character',
            gender: 'gender',
            profession: 'profession',
            level: 69,
            race: 'race',
            userAlias: 'huedwell',
          },
          {
            accountName: 'cool.4321',
            world: 'world',
            name: 'character!',
            gender: 'gender',
            profession: 'profession',
            level: 69,
            race: 'race',
            userAlias: 'huedwell',
          }],
        });

        done();
      });
  });
});