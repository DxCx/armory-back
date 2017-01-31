# Change Log

## Log structure

```
## [Unreleased|major.minor.patch] - yyyy/mm/dd
### Added|Changed|Fixed|Removed
- Changes
```

## [1.5.1] - 31/01/17
### Changed
- Interval for recalculating leaderboards
- Interval for fetching leaderboard data
- Config declarations

### Added
- Small time module for converting hours/minutes to milliseconds

## [1.5.0] - 30/01/17
### Added
- Eu/na pvp leaderboard data fetch
- Stub user generation for leaderboards and guilds
- Stub user claim (new user/existing user with apiToken)
- Healthcheck
- Local db migration test run
- Pvp leaderboard endpoints

### Fixed
- Guild motd from not being saved to db if using obsucure unicode characters
- Guild from not being added to db if tag is not defined

### Changed
- Cleaned up config
- Api token primary key and supporting foreign keys $$_MIGRATIONS_$$
- Consolidated gitter logging to be used in other modules
- User count statistics to be split between stub and real

## [1.4.1] - 2017/01/15
### Fixed
- Users appearing high in the ladder if their rank is `null`

## [1.4.0] - 2017/01/14
### Fixed
- Some data leaking out that shouldn't from pvp leaderboard

### Added
- Endpoints for `na`, `eu`, and `gw2a` pvp leaderboards. Still need to get the data though !

## [1.3.0] - 2017/01/13
### Added
- `gw2aRank` and `naRank` to `PvpStandings` table
- Pvp leaderboard fetcher to calculate gw2aRank and save it to the database
- Read pvp ladder service

### Changed
- User service, controller major refactors

## [1.2.2] - 2017/01/08
### Fixed
- Sitemap to not have empty `lastmod` fields

## [1.2.1] - 2017/01/08
### Changed
- Pvp leaderboard to order with decay in consideration

## [1.2.0] - 2017/01/07
### Changed
- Sitemap to have `priority` and `lastmod`
- Sitemap to have guild tabs

## [1.1.0] - 2017/01/07
### Added
- PvpStandings table to db
- Pvp standings data fetcher
- Current pvp season leaderboard

## [1.0.0] - 2017/01/02
### Added
- This CHANGELOG file to allow more insight to the changes made throughout the development of api.gw2armory.com