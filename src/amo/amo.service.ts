import { Injectable, OnModuleInit } from '@nestjs/common';
import { promises as fs, existsSync, readFileSync } from 'fs';

type ValidationError = {
  code: string;
  path: string;
  detail: string;
};

type ErrorResponse = {
  'validation-errors': Array<{ request_id: string; errors: ValidationError[] }>;
  title: string;
  type: string;
  status: number;
  detail: string;
};

interface CatalogResponse<T> {
  _page: number;
  _links: {
    self: {
      href: string;
    };
  };
  _embedded: T;
}

type ContactResponse = CatalogResponse<{ contacts: UserType[] }>;

type UserType = {
  id: number;
  name: string;
};

@Injectable()
export class AmoService implements OnModuleInit {
  private access_token: string = '';
  private refresh_token: string = '';

  private emailFieldId: number = 0;
  private phoneFieldId: number = 0;

  async onModuleInit() {
    await this.getContactFields();
    console.log('Initialized');
    console.log('emailField:', this.emailFieldId);
    console.log('phoneField:', this.phoneFieldId);
  }

  constructor() {
    if (existsSync('creds.json')) {
      const credentials: {
        token_type: 'Bearer';
        expire: number;
        access_token: string;
        refresh_token: string;
      } = JSON.parse(readFileSync('creds.json', { encoding: 'utf-8' }));
      this.access_token = credentials.access_token;
      this.refresh_token = credentials.refresh_token;
    }
  }
  private baseUrl: string = 'https://komradhrikin.amocrm.ru/';

  // Mb used in the future
  private async getTokenByAuthorizationCode(ac: string): Promise<string> {
    const body = {
      client_id: process.env.INTEGRATION_ID,
      client_secret: process.env.SECRET_KEY,
      grant_type: 'authorization_code',
      code: ac,
      redirect_uri: 'http://localhost:3000/amo/callback',
    };

    const res = await fetch(this.baseUrl + 'oauth2/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const resultJson = await res.json();

    await fs.writeFile('creds.json', JSON.stringify(resultJson), {
      encoding: 'utf-8',
    });
    if (res.status === 200) return 'authorized';
    else return 'Something went wront';
  }
  // Mb used in the future
  private async refreshToken(): Promise<string> {
    const body = {
      client_id: process.env.INTEGRATION_ID,
      client_secret: process.env.SECRET_KEY,
      grant_type: 'refresh_code',
      code: this.refreshToken,
      redirect_uri: 'http://localhost:3000/amo/callback',
    };

    const res = await fetch(this.baseUrl + 'oauth2/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const resultJson = await res.json();

    await fs.writeFile('creds.json', JSON.stringify(resultJson), {
      encoding: 'utf-8',
    });
    this.access_token = resultJson.access_token;
    this.refreshToken = resultJson.refresh_token;
    if (res.status === 200) return 'authorized';
    else return 'Something went wront';
  }

  private async findContactByQuery(query: string): Promise<UserType | null> {
    const searchParams = new URLSearchParams();
    searchParams.set('query', query);
    console.log('api/v4/contacts?' + searchParams.toString());
    const response = await fetch(
      this.baseUrl + 'api/v4/contacts?' + searchParams.toString(),
      {
        headers: {
          Authorization: `Bearer ${this.access_token}`,
        },
      },
    );
    if (response.status === 204) return null;
    const json: ContactResponse = await response.json();
    const foundUser = json._embedded.contacts[0];
    if (!foundUser) return null;
    return foundUser;
  }

  /**
   * Ищем контакт в amoCRM
   * @param email Почта
   * @param phone Телефон
   * @returns ID пользователя или null
   * Приоритетнее поиск по почте. Если по почте не нашли, проверяем телефон.
   */
  async findContact(email?: string, phone?: string): Promise<UserType | null> {
    const promises: Promise<UserType | null>[] = [];
    if (email) {
      promises.push(this.findContactByQuery(email));
    }
    if (phone) {
      promises.push(this.findContactByQuery(phone));
    }
    const foundUsers: UserType[] = (await Promise.all(promises)).filter(
      (val) => !!val,
    );
    if (foundUsers.length === 0) return null;
    else return { id: foundUsers[0].id, name: foundUsers[0].name };
  }

  /**
   * Создает контакт в amoCRM
   * @param name Имя контакта
   * @param email Почта
   * @param phone Телефон
   * @returns {UserType}
   */
  async createContact(
    name: string,
    email: string,
    phone: string,
  ): Promise<UserType> {
    console.log(this.emailFieldId, this.phoneFieldId, email);
    const response = await fetch(this.baseUrl + 'api/v4/contacts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          name,
          custom_fields_values: [
            {
              field_id: this.emailFieldId,
              values: [{ value: email }],
            },
            {
              field_id: this.phoneFieldId,
              values: [{ value: phone }],
            },
          ],
        },
      ]),
    });
    console.log('createContact', response.status);

    const json: ContactResponse | ErrorResponse = await response.json();
    if (json['validation-errors']) {
      console.log(json['validation-errors'][0]);
      throw new Error('Cannot create contact');
    }
    const contacts = (json as ContactResponse)._embedded.contacts;
    console.log('createContact', contacts);
    return { id: contacts[0].id, name };
  }

  /**
   *
   * @param id Обновляет контакт
   * @param name Имя контакта
   * @param email Почта
   * @param phone Телефон
   * @returns {UserType}
   */
  async updateContact(
    id: number,
    name: string,
    email: string,
    phone: string,
  ): Promise<UserType> {
    const response = await fetch(this.baseUrl + 'api/v4/contacts', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          id,
          name,
          custom_fields_values: [
            {
              field_id: this.emailFieldId,
              values: [{ value: email }],
            },
            {
              field_id: this.phoneFieldId,
              values: [{ value: phone }],
            },
          ],
        },
      ]),
    });
    console.log('updateContact', response.status);
    const json: ContactResponse = await response.json();
    if (json['validation-errors']) {
      console.log(json['validation-errors'][0].errors);
      throw new Error('Cannot update contact');
    }
    console.log('updateContact', json);
    return {
      id: json._embedded.contacts[0].id,
      name: json._embedded.contacts[0].name,
    };
  }

  /**
   * Получаем ID кастомных полей телефона и почты
   */
  async getContactFields() {
    const response: CatalogResponse<{ custom_fields: any[] }> = await fetch(
      this.baseUrl + 'api/v4/contacts/custom_fields',
      {
        headers: {
          Authorization: `Bearer ${this.access_token}`,
        },
      },
    ).then((res) => res.json());
    const fields: Array<{ code: string; id: number }> =
      response._embedded.custom_fields.map((cf) => ({
        code: cf.code,
        id: cf.id,
      }));
    const email = fields.find((f) => f.code === 'EMAIL');
    const phone = fields.find((f) => f.code === 'PHONE');
    if (!email || !phone) {
      throw new Error('Cannot get custom fields');
    }
    this.emailFieldId = email.id;
    this.phoneFieldId = phone.id;
  }

  /**
   * Создает сделку в воронке
   * @param contactId ID контакта
   * @param contactName Имя контакта для названия сделки
   * @returns ID сделки
   */
  async createSale(contactId: number, contactName: string): Promise<number> {
    const response = await fetch(this.baseUrl + 'api/v4/leads', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          name: 'Сделка с ' + contactName,
          _embedded: {
            contacts: [{ id: contactId }],
          },
        },
      ]),
    });
    console.log('createSale', response.status);
    const json: CatalogResponse<{ leads: any[] }> = await response.json();
    console.log('createSale', json._embedded.leads);
    return json._embedded.leads[0].id;
  }
}
