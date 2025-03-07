const { DateTime } = require("luxon");

// Кэшированные регулярные выражения для улучшения производительности
const TIMEZONE_REGEX = /(\+|\-)\d{2}:\d{2}$/;
const DATE_FORMATS = {
  DMY: {
    regex: /(?<day>\d{2})(?:-|\/|\.)(?<month>\d{2})(?:-|\/|\.)(?<year>\d{4})/,
    format: "yyyy-MM-dd HH:mm",
  },
  YMD: {
    regex: /(?<year>\d{4})(?:-|\/|\.)(?<month>\d{2})(?:-|\/|\.)(?<day>\d{2})/,
    format: "yyyy-MM-dd HH:mm",
  },
  RUSSIAN: {
    regex: /\D?(?<day>\d{1,2})\D? (?<month>[а-яА-Я]+)\.? (?<year>\d{4})/,
    format: "yyyy-MM-dd HH:mm",
    locale: "ru",
  },
};
const TIME_REGEX = /\d{2}:\d{2}/;

// Карта русских месяцев (вынесена из функции для оптимизации)
const RUSSIAN_MONTHS = new Map([
  ["января", "01"],
  ["февраля", "02"],
  ["марта", "03"],
  ["апреля", "04"],
  ["мая", "05"],
  ["июня", "06"],
  ["июля", "07"],
  ["августа", "08"],
  ["сентября", "09"],
  ["октября", "10"],
  ["ноября", "11"],
  ["декабря", "12"],
  ["янв", "01"],
  ["фев", "02"],
  ["мар", "03"],
  ["апр", "04"],
  ["май", "05"],
  ["июн", "06"],
  ["июл", "07"],
  ["авг", "08"],
  ["сен", "09"],
  ["окт", "10"],
  ["ноя", "11"],
  ["дек", "12"],
]);

function source_d({ src, options }) {
  try {
    const input = src[options];
    if (!input || typeof input !== "string") {
      return null;
    }

    const hasTimeZone = TIMEZONE_REGEX.test(input);

    // Попытка прямого парсинга ISO
    let date = parseISODate(input, hasTimeZone);
    if (date?.isValid) {
      return date.toISO();
    }

    // Попытка парсинга через пользовательские форматы
    date = parseCustomFormats(input, hasTimeZone);
    return date?.isValid ? date.toISO() : null;
  } catch (error) {
    console.error("Error parsing date:", error);
    return null;
  }
}

function parseISODate(input, hasTimeZone) {
  const date = hasTimeZone
    ? DateTime.fromISO(input, { zone: undefined })
    : DateTime.fromISO(input, { zone: "utc" });

  if (!date.isValid) {
    return DateTime.fromFormat(input, "yyyy-MM-ddZZ", {
      zone: hasTimeZone ? undefined : "utc",
    });
  }

  return date;
}

function parseCustomFormats(input, hasTimeZone) {
  const timeMatch = TIME_REGEX.exec(input);
  const defaultTime = "00:00";

  for (const [_, format] of Object.entries(DATE_FORMATS)) {
    const fullDateMatch = format.regex.exec(input);
    if (!fullDateMatch) continue;

    let { year, month, day } = fullDateMatch.groups;

    // Обработка русских месяцев
    if (format.locale === "ru") {
      month = RUSSIAN_MONTHS.get(month);
      if (!month) continue;
    }

    // Нормализация дня (добавление ведущего нуля)
    day = day.padStart(2, "0");

    const prettyDate = `${year}-${month}-${day} ${
      timeMatch?.[0] ?? defaultTime
    }`;
    const parsedDate = DateTime.fromFormat(prettyDate, format.format, {
      zone: hasTimeZone ? undefined : "utc",
      locale: format.locale ?? "en",
    });

    if (parsedDate.isValid) return parsedDate;
  }

  return DateTime.invalid("Формат даты не распознан");
}

module.exports = source_d;
