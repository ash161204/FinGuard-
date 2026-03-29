from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.bootstrap import bootstrap_demo_user


def main() -> None:
    settings = get_settings()
    with SessionLocal() as session:
        result = bootstrap_demo_user(session, settings.demo_user_id)
        print(
            f"demo user {result.user_id} ready "
            f"(user_created={result.user_created}, profile_created={result.profile_created})"
        )


if __name__ == "__main__":
    main()
