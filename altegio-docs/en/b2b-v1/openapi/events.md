# Events

Group events and class management

## Search Events

 - [GET /activity/{location_id}/search](https://developer.alteg.io/en/b2b-v1/openapi/events/search_events.md)

## Search Event Dates

 - [GET /activity/{location_id}/search_dates](https://developer.alteg.io/en/b2b-v1/openapi/events/search_event_dates.md)

## Get Event Date Range

 - [GET /activity/{location_id}/search_dates_range](https://developer.alteg.io/en/b2b-v1/openapi/events/get_event_date_range.md)

## Get Event Search Filters

 - [GET /activity/{location_id}/filters](https://developer.alteg.io/en/b2b-v1/openapi/events/get_event_search_filters.md)

## Duplicate Event

 - [POST /activity/{location_id}/{event_id}/duplicate](https://developer.alteg.io/en/b2b-v1/openapi/events/duplicate_event.md): A request for duplication can be made in 3 ways:

- Specifying a list of dates and times to duplicate

- Specifying the ID of the repetition strategy

- By specifying all repetition parameters

## Search Event Services

 - [GET /activity/{location_id}/services](https://developer.alteg.io/en/b2b-v1/openapi/events/search_event_services.md)

## List Event Duplication Strategies

 - [GET /activity/{location_id}/duplication_strategy](https://developer.alteg.io/en/b2b-v1/openapi/events/list_event_duplication_strategies.md): Duplication of Events occurs based on a set of parameters combined in the "duplication strategy" entity

| Field | Type | Description |
| ------------- | ------------- | ----------------------------------------- |
| title | string | Strategy name |
| repeat_mode_id| integer | Repeat mode |
| days | integer[] | List of days of the week: 0 Sun, 6 Fri |
| interval | integer | Break in searching for dates, in units of type |
| content_type | integer | Duplicate appointments? 1 - no, 2 - yes |

The repeat mode can take the values

| Meaning | Description | Break unit |
| -------- | ------------- | ------------------------------ |
| 1 | Daily | Day |
| 2 | Weekdays | - |
| 3 | Mon Wed Fri | - |
| 4 | Tue Thu | - |
| 5 | Every week | Week |
| 6 | Every month | Month |
| 7 | Every year | Year |

The days field is relevant only for mode 5 - week, for specifying specific days of repetition
If you specify repeat_mode = 5, days = [1,4], interval = 2, then the Event will be
repeat every 3rd week on Mon and Thu

## Create Event Duplication Strategy

 - [POST /activity/{location_id}/duplication_strategy](https://developer.alteg.io/en/b2b-v1/openapi/events/create_event_duplication_strategy.md)

## Update Event Duplication Strategy

 - [POST /activity/{location_id}/duplication_strategy/{strategy_id}](https://developer.alteg.io/en/b2b-v1/openapi/events/update_event_duplication_strategy.md)

## Deprecated. Get Event (deprecated)

 - [GET /activity/{location_id}/{event_id}](https://developer.alteg.io/en/b2b-v1/openapi/events/get_event.md): This endpoint is deprecated. Use GET /v2/locations/{location_id}/events/{event_id} instead.

Migration: The V2 Events API provides JSON:API formatted responses. See operation get_event for details.

## Deprecated. Update Event (deprecated)

 - [PUT /activity/{location_id}/{event_id}](https://developer.alteg.io/en/b2b-v1/openapi/events/update_event.md): This endpoint is deprecated. Use PUT /v2/locations/{location_id}/events/{event_id} instead.

Migration: The V2 Events API provides enhanced validation and JSON:API formatted responses. See operation update_event for details.

## Deprecated. Delete Event (deprecated)

 - [DELETE /activity/{location_id}/{event_id}](https://developer.alteg.io/en/b2b-v1/openapi/events/delete_event.md): This endpoint is deprecated. Use DELETE /v2/locations/{location_id}/events/{event_id} instead.

Migration: The V2 Events API provides JSON:API formatted responses. See operation delete_event for details.

## Deprecated. Create Event (deprecated)

 - [POST /activity/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/events/create_event.md): This endpoint is deprecated. Use POST /v2/locations/{location_id}/events instead.

Migration: The V2 Events API provides enhanced validation, better error handling, and JSON:API format responses. See operation create_event for details.

